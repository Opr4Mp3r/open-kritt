import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination.jsx';

describe('Pagination', () => {
  it('renders the visible range and marks the current page', () => {
    const html = renderToStaticMarkup(
      <Pagination
        page={2}
        pageSize={10}
        totalItems={27}
        totalPages={3}
        startIndex={10}
        endIndex={20}
        setPage={vi.fn()}
        itemLabel="工作流"
      />
    );

    expect(html).toContain('共 27 工作流，当前显示 11–20');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('aria-label="下一页工作流"');
  });

  it('stays hidden when every item fits on one page', () => {
    const html = renderToStaticMarkup(
      <Pagination page={1} pageSize={12} totalItems={8} totalPages={1} startIndex={0} endIndex={8} setPage={vi.fn()} />
    );

    expect(html).toBe('');
  });
});
