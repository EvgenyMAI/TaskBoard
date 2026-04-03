import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { getReportSummary, getReportByProject, getReportByAssignee, downloadReportCsv } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { toLocalInputValue, formatPeriodLabel, num } from '../utils/analyticsFormat';
import AnalyticsPageHeader from '../components/analytics/AnalyticsPageHeader';
import AnalyticsPeriodSection from '../components/analytics/AnalyticsPeriodSection';
import AnalyticsKpiSection from '../components/analytics/AnalyticsKpiSection';
import AnalyticsComparisonSection from '../components/analytics/AnalyticsComparisonSection';
import AnalyticsStatusSection from '../components/analytics/AnalyticsStatusSection';
import AnalyticsRankedBarsSection from '../components/analytics/AnalyticsRankedBarsSection';

export default function AnalyticsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const now = new Date();
  const defaultFromDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  defaultFromDate.setHours(0, 0, 0, 0);
  const defaultFrom = toLocalInputValue(defaultFromDate);
  const defaultTo = toLocalInputValue(now);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [byProject, setByProject] = useState([]);
  const [byAssignee, setByAssignee] = useState([]);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [csvLoading, setCsvLoading] = useState(false);
  const [statusView, setStatusView] = useState('donut');

  const params = useMemo(() => {
    const p = {};
    const fromValue = from || defaultFrom;
    const toValue = to || defaultTo;
    if (fromValue) p.from = new Date(fromValue).toISOString();
    if (toValue) {
      const end = new Date(toValue);
      end.setSeconds(59, 999);
      p.to = end.toISOString();
    }
    return p;
  }, [from, to, defaultFrom, defaultTo]);

  const periodChip = formatPeriodLabel(from || defaultFrom, to || defaultTo);
  const username = user?.username || '';
  const heroLetter = username ? username.charAt(0).toUpperCase() : 'A';

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      getReportSummary(params),
      getReportByProject(params),
      getReportByAssignee(params),
    ])
      .then(([s, p, a]) => {
        const aggr = s?.aggregates || {};
        setSummary(aggr);
        setByProject((p?.aggregates?.byProject || aggr.byProject || []).slice(0, 8));
        setByAssignee((a?.aggregates?.byAssignee || aggr.byAssignee || []).slice(0, 8));
      })
      .catch((e) => {
        setError(e.message);
        toast.error(e.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.from, params.to]);

  const total = num(summary?.totalTasks);
  const overdue = num(summary?.overdueCount);
  const completionRate = Number(summary?.completionRate || 0);
  const withoutAssignee = num(summary?.withoutAssigneeCount);
  const status = summary?.statusBreakdown || {};
  const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;
  const assignedRate = total > 0 ? Math.round(((total - withoutAssignee) / total) * 100) : 0;
  const comparison = summary?.periodComparison || null;
  const maxProject = Math.max(1, ...byProject.map((x) => num(x.count)));
  const maxAssignee = Math.max(1, ...byAssignee.map((x) => num(x.count)));

  const handleDownloadCsv = async () => {
    setCsvLoading(true);
    try {
      const blob = await downloadReportCsv(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const suffix = from || to ? '-filtered' : '';
      link.href = url;
      link.download = `taskboard-report${suffix}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV-отчет выгружен');
    } catch (e) {
      toast.error(e.message || 'Не удалось выгрузить CSV');
    } finally {
      setCsvLoading(false);
    }
  };

  const applyPreset = (days) => {
    const end = new Date();
    const fromDate = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);
    setTo(toLocalInputValue(end));
    setFrom(toLocalInputValue(fromDate));
  };

  return (
    <Layout>
      <div className="container page-width analytics-page">
        <AnalyticsPageHeader heroLetter={heroLetter} username={username} periodChip={periodChip} />

        <AnalyticsPeriodSection
          from={from}
          to={to}
          csvLoading={csvLoading}
          onFromChange={setFrom}
          onToChange={setTo}
          onDownloadCsv={handleDownloadCsv}
          onPreset={applyPreset}
        />

        {error && <p className="error analytics-global-error">{error}</p>}

        <AnalyticsKpiSection
          loading={loading}
          total={total}
          overdue={overdue}
          withoutAssignee={withoutAssignee}
          completionRate={completionRate}
          overdueRate={overdueRate}
          assignedRate={assignedRate}
        />

        {!loading && comparison && <AnalyticsComparisonSection comparison={comparison} />}

        <AnalyticsStatusSection
          loading={loading}
          status={status}
          statusView={statusView}
          onStatusViewChange={setStatusView}
        />

        <AnalyticsRankedBarsSection
          titleId="analytics-projects-heading"
          kicker="Проекты"
          title="Топ проектов по объёму задач"
          loading={loading}
          emptyText="Нет данных за выбранный период."
          rows={byProject}
          maxCount={maxProject}
          barVariant="default"
          getRowKey={(row) => row.projectId}
          getLabel={(row) => row.projectName}
          getCount={(row) => row.count}
          getHref={(row) => `/tasks?projectId=${row.projectId}`}
        />

        <AnalyticsRankedBarsSection
          titleId="analytics-assignees-heading"
          kicker="Команда"
          title="Топ исполнителей по задачам"
          loading={loading}
          emptyText="Нет данных за выбранный период."
          rows={byAssignee}
          maxCount={maxAssignee}
          barVariant="alt"
          getRowKey={(row) => row.userId}
          getLabel={(row) => row.username}
          getCount={(row) => row.count}
          getHref={(row) => `/tasks?assigneeId=${row.userId}`}
        />
      </div>
    </Layout>
  );
}
