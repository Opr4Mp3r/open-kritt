import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../lib/useFetch.js';
import { usePageChrome } from '../context/ui.jsx';
import { CardLinkOverlay, Spinner, ErrorState, EmptyState, Button } from '../components/ui.jsx';
import { rankerDescOf, rankerRuleCount } from '../lib/severityRanker.js';
import { useNewestFirst, usePagination } from '../lib/usePagination.js';
import Pagination from '../components/Pagination.jsx';
import { downloadResourceExport } from '../lib/resourceTransfer.js';
import { useResourceImport } from '../lib/useResourceImport.js';

export default function SeverityRankers() {
  const navigate = useNavigate();
  usePageChrome(
    [{ label: '严重性排序规则', active: true }],
    { label: '+ 新建严重性排序规则', to: '/severity-rankers/new' },
    []
  );
  const { data, loading, error, reload } = useFetch(() => api.severityRankers(), []);
  const rankers = useNewestFirst(data);
  const rankerPages = usePagination(rankers, { pageSize: 9 });
  const resourceImport = useResourceImport({
    resourceType: 'severityRanker',
    label: '严重性排序规则',
    create: api.createSeverityRanker,
    onImported: (ranker) => navigate(`/severity-rankers/${ranker.id}`),
  });

  return (
    <div style={{ padding: '30px 32px', maxWidth: 1180 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-0.02em' }}>严重性排序规则</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 3 }}>
            可复用的规则集，用于指导模型如何评定发现结果的严重性：严重、高、中、低或提示信息。创建扫描时可附加一个或多个规则集。
          </div>
        </div>
        <Button variant="ghost" disabled={resourceImport.importing} onClick={resourceImport.chooseFile}>
          {resourceImport.importing ? '正在导入…' : '导入 JSON'}
        </Button>
      </div>
      <input
        ref={resourceImport.inputRef}
        type="file"
        accept=".json,application/json"
        aria-label="导入严重性排序规则 JSON"
        onChange={resourceImport.importFile}
        style={{ display: 'none' }}
      />

      {resourceImport.importError && (
        <div role="alert" style={{ margin: '18px 0' }}>
          <ErrorState error={{ message: resourceImport.importError }} />
        </div>
      )}

      <div style={{ height: resourceImport.importError ? 4 : 22 }} />

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.length === 0 && (
        <EmptyState
          title="还没有严重性排序规则"
          sub="编写发现结果的分级规则，再将规则附加到扫描任务。"
          action={<Button to="/severity-rankers/new">+ 新建严重性排序规则</Button>}
        />
      )}
      {data && data.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {rankerPages.pageItems.map((r) => {
              const count = rankerRuleCount(r.content);
              return (
                <div
                  key={r.id}
                  style={{
                    position: 'relative',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 18,
                    background: 'var(--surface)',
                    boxShadow: 'var(--shadow)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardLinkOverlay to={`/severity-rankers/${r.id}`} label={`打开严重性排序规则 ${r.name}`} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div className="mono" style={{ fontWeight: 600, fontSize: 14.5 }}>
                      {r.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 'none' }}>
                      <Button
                        variant="ghost"
                        aria-label={`导出 ${r.name}`}
                        title="将严重性排序规则导出为 JSON"
                        onClick={(event) => {
                          event.stopPropagation();
                          downloadResourceExport('severityRanker', r);
                        }}
                        style={{ position: 'relative', zIndex: 2, height: 27, padding: '0 9px', fontSize: 11.5 }}
                      >
                        导出
                      </Button>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--text-3)',
                          border: '1px solid var(--border)',
                          padding: '2px 7px',
                          borderRadius: 5,
                          flex: 'none',
                        }}
                      >
                        {count} 条规则
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.55 }}>
                    {r.description || rankerDescOf(r.content)}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination {...rankerPages} itemLabel="规则集" />
        </>
      )}
    </div>
  );
}
