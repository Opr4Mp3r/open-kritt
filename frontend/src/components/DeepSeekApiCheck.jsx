import { useId, useState } from 'react';
import { api } from '../api/client.js';
import { Button } from './ui.jsx';

export default function DeepSeekApiCheck({ configured }) {
  const id = useId();
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = async (check) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (check) {
        await api.checkDeepSeekModel(model);
        setMessage(`模型 ${model} 的文本 API 检查成功。`);
      } else {
        const result = await api.deepSeekModels();
        setModels(result.models);
        // Keep an exact choice visible if a refreshed catalog no longer lists it.
        setModel((current) => current || result.models[0]?.id || '');
        if (!result.models.length) setMessage('DeepSeek 未返回可用模型。');
      }
    } catch (nextError) {
      setError(nextError.message || '无法完成 DeepSeek 请求。');
    } finally {
      setBusy(false);
    }
  };

  const listed = models.some((item) => item.id === model);
  return (
    <div className="account-empty" aria-busy={busy}>
      <p>加载实时模型列表或运行简短的 API 检查。DeepSeek 扫描和草稿生成使用 Codex。</p>
      {!configured ? (
        <p>添加 DeepSeek API 密钥以加载模型。</p>
      ) : (
        <>
          <Button variant="ghost" onClick={() => run(false)} disabled={busy}>
            {busy ? '请稍候…' : '加载 DeepSeek 模型'}
          </Button>
          {(models.length > 0 || model) && (
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <label htmlFor={id}>用于 API 检查的模型</label>
              <select
                id={id}
                value={model}
                disabled={busy}
                onChange={(event) => {
                  setModel(event.target.value);
                  setMessage('');
                  setError('');
                }}
              >
                {model && !listed && (
                  <option value={model} disabled>
                    {model}（不可用）
                  </option>
                )}
                {models.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p>检查会向 DeepSeek 发送“Reply with OK.”，可能产生少量 API 费用。</p>
              <Button variant="ghost" onClick={() => run(true)} disabled={busy || !listed}>
                运行文本 API 检查
              </Button>
            </div>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
