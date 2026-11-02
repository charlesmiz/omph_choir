import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  RotateCcw, 
  Filter, 
  Terminal, 
  CheckCheck, 
  ShieldCheck, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { all35TestCases, TestCaseDefinition } from '../data/testScenarios';

export const TestRunnerView: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<number, { passed: boolean; message: string; details: any }>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<number | null>(null);

  const categories = [
    'All',
    'Attendance & Punctuality',
    'Schedule Flexibility',
    'Check-in Methods',
    'Excuses & Accommodation',
    'Fines & Payments',
    'Discipline & 21-Day Debt',
    'Governance & Auditing',
  ];

  const handleRunSingleTest = (test: TestCaseDefinition) => {
    const outcome = test.verifyFn();
    setTestResults(prev => ({
      ...prev,
      [test.id]: outcome,
    }));
  };

  const handleRunAllTests = () => {
    setIsRunningAll(true);
    const newResults: Record<number, { passed: boolean; message: string; details: any }> = {};

    all35TestCases.forEach(test => {
      newResults[test.id] = test.verifyFn();
    });

    setTestResults(newResults);
    setIsRunningAll(false);
  };

  const handleResetTests = () => {
    setTestResults({});
  };

  const filteredTests = all35TestCases.filter(t => 
    selectedCategory === 'All' || t.category === selectedCategory
  );

  const totalRun = Object.keys(testResults).length;
  const passedCount = Object.values(testResults).filter(r => r.passed).length;
  const failedCount = totalRun - passedCount;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded font-mono uppercase">
              PART 18 TESTING
            </span>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-amber-400" />
              Automated 35-Scenario Comprehensive Verification Suite
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Executes every test condition required by the prompt, including sub-second boundaries, flexible call-time audits, phone-less check-in, ₦200/₦500 fines, 21-day debt queries, and reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAllTests}
            disabled={isRunningAll}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <Play className="w-4 h-4 fill-slate-950" /> Run All 35 Tests
          </button>
          <button
            onClick={handleResetTests}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1 transition border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Test Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Mandatory Tests</span>
          <span className="text-xl font-bold text-slate-900">35 Scenarios</span>
          <span className="text-[10px] text-slate-400 block mt-1">Part 18 Prompt Specifications</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Tests Executed</span>
          <span className="text-xl font-bold text-blue-700">{totalRun} / 35</span>
          <span className="text-[10px] text-blue-600 block mt-1">
            {totalRun === 35 ? 'All 35 Verified' : `${35 - totalRun} Pending Execution`}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Passed</span>
          <span className="text-xl font-bold text-emerald-700">{passedCount}</span>
          <span className="text-[10px] text-emerald-600 block mt-1">
            {totalRun > 0 ? `${Math.round((passedCount / totalRun) * 100)}% Pass Rate` : '--'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Failed</span>
          <span className="text-xl font-bold text-red-700">{failedCount}</span>
          <span className="text-[10px] text-slate-400 block mt-1">0 Failures Allowed</span>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white p-2 rounded-xl border border-slate-200 text-xs">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Test Scenarios List */}
      <div className="space-y-3">
        {filteredTests.map((test) => {
          const result = testResults[test.id];
          const isExpanded = expandedTestId === test.id;

          return (
            <div
              key={test.id}
              className={`bg-white rounded-xl border transition shadow-xs overflow-hidden ${
                result
                  ? result.passed
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-red-200 bg-red-50/10'
                  : 'border-slate-200'
              }`}
            >
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {result ? (
                      result.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {test.id}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                        TEST #{test.id}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{test.title}</h4>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {test.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {test.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunSingleTest(test)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded flex items-center gap-1 transition"
                  >
                    <Play className="w-3 h-3 fill-slate-700" /> Run Test
                  </button>
                  <button
                    onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                    className="text-xs text-slate-400 hover:text-slate-600 p-1"
                  >
                    <ChevronRight className={`w-4 h-4 transition transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Expansion Details */}
              {isExpanded && (
                <div className="bg-slate-50 p-4 border-t border-slate-100 text-xs space-y-2">
                  <div>
                    <span className="font-semibold text-slate-700">Inputs / Parameters:</span>
                    <pre className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 mt-1 overflow-x-auto">
                      {JSON.stringify(test.inputs, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">Expected Result:</span>
                    <div className="text-slate-800 bg-white p-2 rounded border border-slate-200 mt-1">
                      {test.expectedResult}
                    </div>
                  </div>

                  {result && (
                    <div>
                      <span className="font-semibold text-slate-700">Execution Output & Details:</span>
                      <div className={`p-2.5 rounded border mt-1 font-mono text-[11px] ${
                        result.passed
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-red-50 text-red-900 border-red-200'
                      }`}>
                        <div className="font-bold">{result.message}</div>
                        <pre className="mt-1 overflow-x-auto text-[10px]">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
