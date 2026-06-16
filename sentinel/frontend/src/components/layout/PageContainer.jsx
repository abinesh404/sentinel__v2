const PageContainer = ({ title, description, actions, children, bodyStyle }) => {
  return (
    <div className="main-content" style={{ marginTop: '16px' }}>
      {/* Page Header */}
      <div style={{
        padding: '14px 28px',
        backgroundColor: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', width: '100%' }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            margin: 0,
            letterSpacing: '-0.4px',
            color: '#0f172a',
          }}>
            {title}
          </h1>
          {description && (
            <div style={{
              fontSize: '12.5px',
              color: '#64748b',
              margin: 0,
              lineHeight: '1.4',
              width: '100%'
            }}>
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {actions}
          </div>
        )}
      </div>

      {/* Main Page Body */}
      <div className="scrollable-container" style={bodyStyle}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
