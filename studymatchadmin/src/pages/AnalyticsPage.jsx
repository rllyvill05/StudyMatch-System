import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  getAnalyticsOverview,
  getSessionTrends,
  getSubjectDemand,
  getUserGrowth,
  getRequestStats,
  getSessionStatusBreakdown,
  getTopTutors,
} from '../api/analytics'

const StatCard = ({ label, value, sub, color = 'text-indigo-600' }) => (
  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
    <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
    <p className={`text-3xl font-bold ${color}`}>
      {value ?? <span className="text-gray-300 text-2xl">—</span>}
    </p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
)

export default function AnalyticsPage() {
  const [overview,       setOverview]       = useState(null)
  const [sessionTrends,  setSessionTrends]  = useState([])
  const [subjectDemand,  setSubjectDemand]  = useState([])
  const [userGrowth,     setUserGrowth]     = useState([])
  const [requestStats,   setRequestStats]   = useState(null)
  const [sessionStatus,  setSessionStatus]  = useState(null)
  const [topTutors,      setTopTutors]      = useState([])
  const [days,           setDays]           = useState(30)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')

  const fetchAll = async (d = days) => {
    setLoading(true)
    setError('')
    try {
      const [ov, st, sd, ug, rs, ss, tt] = await Promise.all([
        getAnalyticsOverview(),
        getSessionTrends(d),
        getSubjectDemand(),
        getUserGrowth(d),
        getRequestStats(),
        getSessionStatusBreakdown(),
        getTopTutors(),
      ])
      setOverview(ov.data)
      setSessionTrends(Array.isArray(st.data?.trends)   ? st.data.trends   : [])
      setSubjectDemand(Array.isArray(sd.data?.subjects)  ? sd.data.subjects : [])
      setUserGrowth(Array.isArray(ug.data?.growth)       ? ug.data.growth   : [])
      setRequestStats(rs.data ?? null)
      setSessionStatus(ss.data ?? null)
      setTopTutors(Array.isArray(tt.data?.tutors) ? tt.data.tutors : [])
    } catch {
      setError('Failed to load analytics data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleDaysChange = (d) => {
    setDays(d)
    fetchAll(d)
  }

  // ── Shared date axis (aligned between session trends & user growth) ──
  const dateAxis = sessionTrends.map(d => d.date)
  const userGrowthMap = Object.fromEntries(userGrowth.map(d => [d.date, d.total]))
  const alignedUserGrowth = dateAxis.map(date => userGrowthMap[date] ?? 0)

  // ── Chart options ──────────────────────────────────────────────────

  const sessionTrendOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        return `${p.axisValue}<br/>Sessions: <b>${p.data}</b>`
      },
    },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: dateAxis,
      axisLabel: {
        fontSize: 10,
        color: '#94a3b8',
        rotate: dateAxis.length > 14 ? 30 : 0,
      },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 11, color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [{
      data: sessionTrends.map(d => d.total),
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { color: '#6366f1', width: 2.5 },
      itemStyle: { color: '#6366f1' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(99,102,241,0.18)' },
            { offset: 1, color: 'rgba(99,102,241,0)' },
          ],
        },
      },
    }],
  }

  const userGrowthOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const s = params.find(p => p.seriesName === 'Students')
        const t = params.find(p => p.seriesName === 'Tutors')
        return `${params[0].axisValue}<br/>Students: <b>${s?.data ?? 0}</b><br/>Tutors: <b>${t?.data ?? 0}</b>`
      },
    },
    legend: {
      data: ['Students', 'Tutors'],
      textStyle: { fontSize: 11, color: '#64748b' },
      top: 0,
    },
    grid: { left: 40, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: 'category',
      data: userGrowth.map(d => d.date),
      axisLabel: {
        fontSize: 10,
        color: '#94a3b8',
        rotate: userGrowth.length > 14 ? 30 : 0,
      },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 11, color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: 'Students',
        data: userGrowth.map(d => d.students),
        type: 'bar',
        stack: 'total',
        barMaxWidth: 32,
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#818cf8' }, { offset: 1, color: '#c7d2fe' }] },
          borderRadius: [0, 0, 0, 0],
        },
      },
      {
        name: 'Tutors',
        data: userGrowth.map(d => d.tutors),
        type: 'bar',
        stack: 'total',
        barMaxWidth: 32,
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#a7f3d0' }] },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }

  const subjectDemandOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const d = params.find(p => p.seriesName === 'Student Demand')
        const s = params.find(p => p.seriesName === 'Tutor Supply')
        return `${params[0].axisValue}<br/>Demand: <b>${d?.data ?? 0}</b><br/>Supply: <b>${s?.data ?? 0}</b>`
      },
    },
    legend: {
      data: ['Student Demand', 'Tutor Supply'],
      textStyle: { fontSize: 11, color: '#64748b' },
      top: 0,
    },
    grid: { left: 120, right: 20, top: 30, bottom: 20 },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 11, color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: subjectDemand.map(d => d.name),
      axisLabel: { fontSize: 11, color: '#475569' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    series: [
      {
        name: 'Student Demand',
        data: subjectDemand.map(d => d.student_demand),
        type: 'bar',
        barMaxWidth: 20,
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [{ offset: 0, color: '#6366f1' }, { offset: 1, color: '#a5b4fc' }] },
          borderRadius: [0, 4, 4, 0],
        },
      },
      {
        name: 'Tutor Supply',
        data: subjectDemand.map(d => d.tutor_supply),
        type: 'bar',
        barMaxWidth: 20,
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#6ee7b7' }] },
          borderRadius: [0, 4, 4, 0],
        },
      },
    ],
  }

  const activityCompareOption = {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['Sessions', 'New Users'],
      textStyle: { fontSize: 12, color: '#64748b' },
      top: 0,
    },
    grid: { left: 40, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: dateAxis,
      axisLabel: {
        fontSize: 10,
        color: '#94a3b8',
        rotate: dateAxis.length > 14 ? 30 : 0,
      },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 11, color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: 'Sessions',
        data: sessionTrends.map(d => d.total),
        type: 'line',
        smooth: true,
        lineStyle: { color: '#6366f1', width: 2 },
        itemStyle: { color: '#6366f1' },
        symbol: 'circle',
        symbolSize: 5,
      },
      {
        name: 'New Users',
        data: alignedUserGrowth,
        type: 'line',
        smooth: true,
        lineStyle: { color: '#10b981', width: 2 },
        itemStyle: { color: '#10b981' },
        symbol: 'circle',
        symbolSize: 5,
      },
    ],
  }

  const requestStatusOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { fontSize: 12, color: '#64748b' },
    },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['40%', '50%'],
      data: [
        { value: requestStats?.pending   ?? 0, name: 'Pending',   itemStyle: { color: '#f59e0b' } },
        { value: requestStats?.accepted  ?? 0, name: 'Accepted',  itemStyle: { color: '#10b981' } },
        { value: requestStats?.declined  ?? 0, name: 'Declined',  itemStyle: { color: '#ef4444' } },
        { value: requestStats?.cancelled ?? 0, name: 'Cancelled', itemStyle: { color: '#94a3b8' } },
      ].filter(d => d.value > 0),
      label: { show: false },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' },
      },
    }],
  }

  const sessionStatusOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { fontSize: 12, color: '#64748b' },
    },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['40%', '50%'],
      data: [
        { value: sessionStatus?.scheduled  ?? 0, name: 'Scheduled',  itemStyle: { color: '#6366f1' } },
        { value: sessionStatus?.ongoing    ?? 0, name: 'Ongoing',    itemStyle: { color: '#f59e0b' } },
        { value: sessionStatus?.completed  ?? 0, name: 'Completed',  itemStyle: { color: '#10b981' } },
        { value: sessionStatus?.cancelled  ?? 0, name: 'Cancelled',  itemStyle: { color: '#ef4444' } },
        { value: sessionStatus?.pending    ?? 0, name: 'Pending',    itemStyle: { color: '#94a3b8' } },
      ].filter(d => d.value > 0),
      label: { show: false },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' },
      },
    }],
  }

  const topTutorsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => `${params[0].axisValue}<br/>Sessions: <b>${params[0].data}</b>`,
    },
    grid: { left: 140, right: 30, top: 10, bottom: 10 },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 11, color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: topTutors.map(t => t.name),
      axisLabel: { fontSize: 12, color: '#475569' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    series: [{
      data: topTutors.map(t => t.session_count),
      type: 'bar',
      barMaxWidth: 28,
      itemStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [{ offset: 0, color: '#6366f1' }, { offset: 1, color: '#a5b4fc' }] },
        borderRadius: [0, 6, 6, 0],
      },
    }],
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Loading analytics...</div>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
      {error}
    </div>
  )

  const noData = (arr) => arr.length === 0 || arr.every(d => (d.total ?? 0) === 0)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">
            Platform performance and usage insights
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 60].map(d => (
            <button
              key={d}
              onClick={() => handleDaysChange(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                days === d
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          label="Total Users"
          value={overview?.total_users}
          sub={`${overview?.active_students ?? 0} students · ${overview?.active_tutors ?? 0} tutors`}
          color="text-indigo-600"
        />
        <StatCard
          label="Total Sessions"
          value={overview?.total_sessions}
          sub={`${overview?.completion_rate ?? 0}% completion rate`}
          color="text-indigo-600"
        />
        <StatCard
          label="Completed Sessions"
          value={overview?.completed_sessions}
          color="text-emerald-600"
        />
        <StatCard
          label="Accepted Matches"
          value={overview?.total_matches}
          color="text-blue-600"
        />
        <StatCard
          label="Total Complaints"
          value={overview?.total_complaints}
          sub={`${overview?.open_complaints ?? 0} open`}
          color="text-red-500"
        />
      </div>

      {/* Session trends + User growth */}
      <div className="grid grid-cols-2 gap-4">

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Session Activity — last {days} days
          </h2>
          {noData(sessionTrends) ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
              No sessions in this period
            </div>
          ) : (
            <ReactECharts option={sessionTrendOption} style={{ height: 220 }} />
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            User Growth — last {days} days
          </h2>
          {noData(userGrowth) ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
              No new users in this period
            </div>
          ) : (
            <ReactECharts option={userGrowthOption} style={{ height: 220 }} />
          )}
        </div>

      </div>

      {/* Subject demand */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Subject Demand vs Tutor Supply — top 10 subjects
        </h2>
        {subjectDemand.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
            No subject data available
          </div>
        ) : (
          <ReactECharts option={subjectDemandOption} style={{ height: 300 }} />
        )}
      </div>

      {/* Sessions vs New Users overlay */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Sessions vs New Users — last {days} days
        </h2>
        {noData(sessionTrends) && noData(userGrowth) ? (
          <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
            No activity data for this period
          </div>
        ) : (
          <ReactECharts option={activityCompareOption} style={{ height: 240 }} />
        )}
      </div>

      {/* Request status + Session status donuts */}
      <div className="grid grid-cols-2 gap-4">

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Match Request Status Breakdown
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            {requestStats?.total ?? 0} total requests
          </p>
          {!requestStats || requestStats.total === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
              No match requests yet
            </div>
          ) : (
            <ReactECharts option={requestStatusOption} style={{ height: 200 }} />
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Session Status Breakdown
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            {sessionStatus?.total ?? 0} total sessions
          </p>
          {!sessionStatus || sessionStatus.total === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
              No sessions yet
            </div>
          ) : (
            <ReactECharts option={sessionStatusOption} style={{ height: 200 }} />
          )}
        </div>

      </div>

      {/* Top tutors */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Top 5 Tutors by Sessions
        </h2>
        {topTutors.length === 0 || topTutors.every(t => t.session_count === 0) ? (
          <div className="flex items-center justify-center h-32 text-gray-300 text-sm">
            No session data yet
          </div>
        ) : (
          <ReactECharts option={topTutorsOption} style={{ height: 180 }} />
        )}
      </div>

    </div>
  )
}
