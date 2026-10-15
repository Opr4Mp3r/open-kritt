import { useNavigate } from 'react-router-dom';
import { CardLinkOverlay, Spinner, ErrorState, EmptyState, Button } from '../components/ui.jsx';
import { api } from '../api/client.js';
import { useFetch } from '../lib/useFetch.js';
import { usePageChrome } from '../context/ui.jsx';
import { useNewestFirst, usePagination } from '../lib/usePagination.js';
import Pagination from '../components/Pagination.jsx';
import { downloadResourceExport } from '../lib/resourceTransfer.js';
import { useResourceImport } from '../lib/useResourceImport.js';

export default function AgentSkills() {
  const navigate = useNavigate();
  usePageChrome([{ label: '智能体技能', active: true }], { label: '+ 新建技能', to: '/agent-skills/new' }, []);
  const { data, loading, error, reload } = useFetch(() => api.agentSkills(), []);
  const skills = useNewestFirst(data);
  const skillPages = usePagination(skills, { pageSize: 9 });
  const resourceImport = useResourceImport({
    resourceType: 'agentSkill',
    label: '智能体技能',
    create: api.createAgentSkill,
    onImported: (skill) => navigate(`/agent-skills/${skill.id}`),
  });

  return (
    <div style={{ padding: '30px 32px', maxWidth: 1180 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-0.02em' }}>智能体技能</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 3 }}>
            可为每次扫描选择，并安装到各执行智能体的主目录中。
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
        aria-label="导入智能体技能 JSON"
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
          title="还没有智能体技能"
          sub="创建可复用的安全审查指令，并将其附加到扫描任务。"
          action={<Button to="/agent-skills/new">+ 新建技能</Button>}
        />
      )}
      {data && data.length > 0 && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 14,
              paddingRight: 4,
            }}
          >
            {skillPages.pageItems.map((skill) => (
              <div
                key={skill.id}
                style={{
                  position: 'relative',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 18,
                  background: 'var(--surface)',
                  boxShadow: 'var(--shadow)',
                  cursor: 'pointer',
                }}
              >
                <CardLinkOverlay to={`/agent-skills/${skill.id}`} label={`打开智能体技能 ${skill.name}`} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div className="mono" style={{ fontWeight: 600, fontSize: 14.5 }}>
                    {skill.name}
                  </div>
                  <Button
                    variant="ghost"
                    aria-label={`导出 ${skill.name}`}
                    title="将智能体技能导出为 JSON"
                    onClick={(event) => {
                      event.stopPropagation();
                      downloadResourceExport('agentSkill', skill);
                    }}
                    style={{ position: 'relative', zIndex: 2, height: 27, padding: '0 9px', fontSize: 11.5 }}
                  >
                    导出
                  </Button>
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>
                  {skill.slug}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-2)',
                    marginTop: 8,
                    lineHeight: 1.5,
                    height: 56,
                    overflow: 'hidden',
                  }}
                >
                  {skill.description}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-2)',
                  }}
                >
                  {skill.licenseSpdx && <Chip>{skill.licenseSpdx}</Chip>}
                  {skill.sourceUrl && (
                    <a
                      href={skill.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mono"
                      style={{
                        position: 'relative',
                        zIndex: 2,
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 22,
                        padding: '0 9px',
                        borderRadius: 6,
                        border: '1px solid var(--accent)',
                        background: 'var(--accent-subtle)',
                        color: 'var(--accent)',
                        fontSize: 10.5,
                        fontWeight: 700,
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      source
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination {...skillPages} itemLabel="skills" />
        </>
      )}
    </div>
  );
}

function Chip({ children }) {
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        padding: '0 7px',
        fontSize: 10,
        color: 'var(--text-2)',
        background: 'var(--surface-2)',
        borderRadius: 5,
      }}
    >
      {children}
    </span>
  );
}
