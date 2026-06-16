"""
insights_classifier.py
----------------------
Classifies each uploaded RCM control into one of three CompliBear tabs by
comparing its text semantically against the 393 audit-script descriptions in
insights.csv using an overlap-coefficient similarity score.

Tab routing:
  overlap >= HIGH_THRESHOLD  → complibear_integrated
  overlap >= LOW_THRESHOLD   → low_hanging_fruit
  overlap <  LOW_THRESHOLD   → ready_for_deployment
"""

import os
import re
import math
import pandas as pd
import numpy as np

# ── Thresholds ──────────────────────────────────────────────────────────────
# Combined score = max(Overlap, Cosine)
# Calibrated against real RCM samples:
HIGH_THRESHOLD = 0.55   # ≥55% → CompliBear Integrated
LOW_THRESHOLD  = 0.35   # ≥35% → Low Hanging Fruit

# ── Stopwords to strip before matching ──────────────────────────────────────
_STOPWORDS = {
    'to', 'the', 'a', 'an', 'and', 'or', 'in', 'of', 'for', 'is', 'are',
    'be', 'has', 'have', 'been', 'was', 'were', 'will', 'would', 'shall',
    'should', 'not', 'no', 'by', 'with', 'on', 'at', 'from', 'as', 'if',
    'it', 'its', 'this', 'that', 'these', 'those', 'such', 'where', 'when',
    'which', 'who', 'can', 'may', 'do', 'does', 'did', 'had', 'per', 'all',
    'any', 'both', 'into', 'over', 'after', 'before', 'under', 'above',
    'out', 'up', 'upon', 'than', 'more', 'so', 'also', 'each', 'there',
    'same', 'used', 'using', 'made', 'make', 'ensure', 'identify',
    'instances', 'case', 'cases', 'based', 'other', 'non', 'via', 'vs',
    'i', 'you', 'he', 'she', 'they', 'them', 'us', 'me', 'my', 'your', 'etc'
}

# ── Multi-word Phrases (N-grams) ───────────────────────────────────────────
_PHRASES = [
    "credit limit",
    "purchase order",
    "bank account",
    "access control",
    "segregation of duties",
    "sod",
    "user access",
    "general ledger",
    "gl account",
    "dual authorization",
    "dual approval",
    "change management",
    "data backup",
    "security policy",
    "fixed asset",
    "inventory management",
    "quality management",
    "scrap management",
    "invoice processing",
    "forex gain",
    "foreign exchange",
    "interest rate",
    "tax compliance",
    "compliance report",
]

# ── Audit Synonym Dictionary ───────────────────────────────────────────────
_SYNONYMS = {
    # vendors / suppliers
    "supplier": "vendor",
    "thirdparty": "vendor",
    "third_party": "vendor",
    "partner": "vendor",
    
    # payments / cheques
    "cheque": "payment",
    "check": "payment",
    "disbursement": "payment",
    "pay": "payment",
    "payable": "payment",
    
    # staff / employees
    "staff": "employee",
    "personnel": "employee",
    "user": "employee",
    "worker": "employee",
    
    # system / technology
    "sap": "erp",
    "oracle": "erp",
    "system": "erp",
    "software": "erp",
    "application": "erp",
    "program": "erp",
    "platform": "erp",
    
    # security / access
    "access": "permission",
    "privilege": "permission",
    "role": "permission",
    
    # validation / reconciliation
    "reconcile": "verify",
    "reconciliat": "verify",
    "reconciliate": "verify",
    "audit": "verify",
    "review": "verify",
    "monitor": "verify",
    "scrutinize": "verify",
    "examine": "verify",
    "ref": "reference",
    "referenc": "reference",
}

# ── Global TF-IDF Vocabulary Space ─────────────────────────────────────────
_VOCAB = []
_IDF = {}


def _stem(word: str) -> str:
    """A lightweight suffix-stripping stemmer for common audit terms."""
    w = word.lower()
    if len(w) <= 3:
        return w
    
    # Standardize -ize/ise/izing/ising/ized/ised/ization/isation endings early
    w = re.sub(r'i[zs]ation$', 'ize', w)
    w = re.sub(r'i[zs]ing$', 'ize', w)
    w = re.sub(r'i[zs]ed$', 'ize', w)
    w = re.sub(r'i[zs]e$', 'ize', w)
    
    # Plurals
    if w.endswith("sses"):
        w = w[:-2]
    elif w.endswith("ies"):
        w = w[:-3] + "y"
    elif w.endswith("s") and not w.endswith("ss") and not w.endswith("us") and not w.endswith("is"):
        w = w[:-1]
        
    # Standard verb/noun suffix simplification
    if w.endswith("eed"):
        if w.endswith("ceed") or len(w) <= 5:
            pass
        else:
            w = w[:-1]
    elif w.endswith("ing"):
        w = w[:-3]
        if w.endswith("at"): # e.g. automating -> automate
            w = w + "e"
        elif len(w) > 1 and w[-1] == w[-2] and w[-1] not in 'aeiouy':
            w = w[:-1]
    elif w.endswith("ed"):
        w = w[:-2]
        if w.endswith("at"): # e.g. automated -> automate
            w = w + "e"
        elif len(w) > 1 and w[-1] == w[-2] and w[-1] not in 'aeiouy':
            w = w[:-1]
            
    if w.endswith("ation"):
        w = w[:-5] + "ate"
    elif w.endswith("al"):
        w = w[:-2]
    elif w.endswith("ment") and len(w) > 6:
        w = w[:-4]
        
    return w


def _normalize_token(token: str) -> str:
    """Stem word and replace with canonical synonym if present."""
    stemmed = _stem(token)
    return _SYNONYMS.get(stemmed, _SYNONYMS.get(token, stemmed))


def _tokenize(text: str) -> set:
    """Lowercase, strip punctuation, remove stopwords, stem and map synonyms."""
    if not text:
        return set()
    try:
        if pd.isnull(text):
            return set()
    except Exception:
        pass
    t = str(text).lower()
    
    # Replace phrases with underscore-joined version
    for phrase in _PHRASES:
        t = t.replace(phrase, phrase.replace(" ", "_"))
        
    t = re.sub(r'[^\w\s]', ' ', t)          # remove punctuation
    t = re.sub(r'\d+', ' ', t)              # remove standalone numbers
    tokens = t.split()
    
    processed_tokens = set()
    for tok in tokens:
        if len(tok) > 2 and tok not in _STOPWORDS:
            norm = _normalize_token(tok)
            if norm and norm not in _STOPWORDS:
                processed_tokens.add(norm)
    return processed_tokens


def _overlap_coefficient(set_a: set, set_b: set) -> float:
    """
    Overlap coefficient = |A ∩ B| / min(|A|, |B|).
    Robust when one set is much smaller than the other (short insight vs long control).
    """
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    return intersection / min(len(set_a), len(set_b))


def _compute_tfidf_vector(tokens: set) -> np.ndarray:
    """Compute normalized TF-IDF vector for a set of tokens."""
    vector = np.zeros(len(_VOCAB), dtype=np.float32)
    if not tokens or len(_VOCAB) == 0:
        return vector
        
    for i, term in enumerate(_VOCAB):
        if term in tokens:
            vector[i] = _IDF[term]
            
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
    return vector


def _cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Compute cosine similarity between two pre-normalized vectors."""
    return float(np.dot(vec_a, vec_b))


def load_insights_library(insights_csv_path: str) -> list:
    """
    Load insights.csv and return a list of pre-tokenized keyword sets and precomputed TF-IDF vectors.
    """
    global _VOCAB, _IDF
    if not os.path.exists(insights_csv_path):
        print(f"[InsightsClassifier] WARNING: insights.csv not found at {insights_csv_path}")
        return []
    try:
        df = pd.read_csv(insights_csv_path)
        library = []
        all_tokens_list = []
        for _, row in df.iterrows():
            desc = str(row.get('description', '') or '')
            tokens = _tokenize(desc)
            if tokens:
                library.append({"tokens": tokens, "description": desc})
                all_tokens_list.append(tokens)
                
        # 1. Build Vocabulary
        unique_tokens = set()
        for tokens in all_tokens_list:
            unique_tokens.update(tokens)
        _VOCAB = sorted(list(unique_tokens))
        
        # 2. Compute Document Frequency (DF) and IDF
        N = len(all_tokens_list)
        df_count = {token: 0 for token in _VOCAB}
        for tokens in all_tokens_list:
            for token in tokens:
                if token in df_count:
                    df_count[token] += 1
                    
        _IDF = {}
        for token, count in df_count.items():
            _IDF[token] = math.log((1 + N) / (1 + count)) + 1.0
            
        # 3. Precompute TF-IDF vector for each insight in the library
        for item in library:
            item["vector"] = _compute_tfidf_vector(item["tokens"])
            
        print(f"[InsightsClassifier] Loaded {len(library)} insights and precomputed TF-IDF vector space with vocab size {len(_VOCAB)}")
        return library
    except Exception as e:
        print(f"[InsightsClassifier] ERROR loading insights library: {e}")
        return []


def _rule_based_fallback(ctrl_text: str, control_type: str = '', frequency: str = '') -> str:
    """
    Simple rule-based fallback used when insights.csv is unavailable.
    Uses control_type and frequency from the row itself.
    """
    ctrl_upper = str(ctrl_text).upper()
    type_upper = str(control_type).upper()
    freq_upper  = str(frequency).upper()

    # Automated / system-enforced controls → already integrated
    if 'AUTOMAT' in type_upper or 'SYSTEM' in ctrl_upper or 'ERP' in ctrl_upper or 'SAP' in ctrl_upper:
        return 'complibear_integrated'

    # Manual + high-frequency → easy win to automate
    if 'MANUAL' in type_upper and any(kw in freq_upper for kw in ['DAILY', 'WEEKLY', 'CONTINUOUS']):
        return 'low_hanging_fruit'

    return 'ready_for_deployment'


def classify_control(
    ctrl_text: str,
    risk_text: str,
    insights_library: list,
    control_type: str = '',
    frequency: str = '',
) -> str:
    """
    Classify a single uploaded RCM control against the insights knowledge base.

    Args:
        ctrl_text:        The control activity / description text.
        risk_text:        The associated risk description text.
        insights_library: Pre-loaded list of dicts with tokenized insight sets and vectors.
        control_type:     e.g. "Manual", "Automated", "Semi-Automated"
        frequency:        e.g. "Daily", "Monthly", "Continuous"

    Returns:
        One of: 'complibear_integrated', 'low_hanging_fruit', 'ready_for_deployment'
    """
    if not insights_library:
        return _rule_based_fallback(ctrl_text, control_type, frequency)

    # Combine control + risk text for richer matching
    combined_tokens = _tokenize(ctrl_text) | _tokenize(risk_text)

    if not combined_tokens:
        return _rule_based_fallback(ctrl_text, control_type, frequency)

    # Compute TF-IDF vector for control
    ctrl_vector = _compute_tfidf_vector(combined_tokens)

    # Find best overlap/cosine score across all insights
    best_score = 0.0
    best_kw_score = 0.0
    best_sem_score = 0.0
    
    for insight in insights_library:
        insight_tokens = insight["tokens"]
        insight_vector = insight["vector"]
        
        # 1. Overlap Coefficient (Keyword score)
        kw_score = _overlap_coefficient(combined_tokens, insight_tokens)
        
        # 2. TF-IDF Cosine Similarity (Semantic score)
        sem_score = _cosine_similarity(ctrl_vector, insight_vector)
        
        # Combined score: maximum of keyword and semantic similarity
        combined_score = max(kw_score, sem_score)
        
        if combined_score > best_score:
            best_score = combined_score
            best_kw_score = kw_score
            best_sem_score = sem_score

    # For debugging and logging match details
    print(f"[InsightsClassifier] Match details: best_score={best_score:.3f} (kw={best_kw_score:.3f}, sem={best_sem_score:.3f}) | ctrl={str(ctrl_text)[:45]}...")

    # Route to tab
    if best_score >= HIGH_THRESHOLD:
        return 'complibear_integrated'
    elif best_score >= LOW_THRESHOLD:
        return 'low_hanging_fruit'
    else:
        return 'ready_for_deployment'
