import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudyTimeChart from '@/components/shared/StudyTimeChart';
import type { WeeklyStudyData } from '@/types/planner';

// Recharts uses ResizeObserver internally
vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

const makeData = (): WeeklyStudyData[] => [
  { weekStartDate: '2026-03-02', totalMinutes: 120 },
  { weekStartDate: '2026-03-09', totalMinutes: 180 },
  { weekStartDate: '2026-03-16', totalMinutes: 90 },
  { weekStartDate: '2026-03-23', totalMinutes: 240 },
];

describe('StudyTimeChart', () => {
  it('renders the chart title', () => {
    render(<StudyTimeChart data={makeData()} average={157} />);
    expect(screen.getByText('Study Time Trend')).toBeInTheDocument();
  });

  it('displays average in header', () => {
    render(<StudyTimeChart data={makeData()} average={157} />);
    expect(screen.getByText(/Avg: 2\.6h \/ week/)).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<StudyTimeChart data={[]} average={0} />);
    expect(screen.getByText('No study data yet')).toBeInTheDocument();
  });

  it('renders course filter buttons when courses provided', () => {
    const courses = [
      { id: 'c1', name: 'Math' },
      { id: 'c2', name: 'Physics' },
    ];
    const onChange = vi.fn();
    render(
      <StudyTimeChart
        data={makeData()}
        average={157}
        courses={courses}
        onCourseFilterChange={onChange}
      />,
    );
    expect(screen.getByText('All Courses')).toBeInTheDocument();
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });

  it('calls onCourseFilterChange when a course button is clicked', () => {
    const courses = [{ id: 'c1', name: 'Math' }];
    const onChange = vi.fn();
    render(
      <StudyTimeChart
        data={makeData()}
        average={157}
        courses={courses}
        onCourseFilterChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Math'));
    expect(onChange).toHaveBeenCalledWith('c1');
  });

  it('calls onCourseFilterChange with null when All Courses is clicked', () => {
    const courses = [{ id: 'c1', name: 'Math' }];
    const onChange = vi.fn();
    render(
      <StudyTimeChart
        data={makeData()}
        average={157}
        courses={courses}
        courseFilter="c1"
        onCourseFilterChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('All Courses'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
