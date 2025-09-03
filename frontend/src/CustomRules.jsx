import React from 'react';

const CustomRules = ({ allColumns, selectedColumn, setSelectedColumn, selectedRuleType, setSelectedRuleType, dateFormat, setDateFormat, countryMapping, setCountryMapping, handleApplyRule, fileId, loading }) => {
  return (
    <div className="bg-card-background p-6 rounded-lg shadow-md mt-8">
      <h2 className="text-xl font-semibold mb-4">Apply Custom Rules</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="column-select" className="block text-sm font-medium text-text-secondary">Select Column:</label>
          <select
            id="column-select"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-input-border bg-input-background text-text-primary focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm rounded-md"
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
          >
            <option value="">-- Select a column --</option>
            {allColumns.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rule-type-select" className="block text-sm font-medium text-text-secondary">Select Rule Type:</label>
          <select
            id="rule-type-select"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-input-border bg-input-background text-text-primary focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm rounded-md"
            value={selectedRuleType}
            onChange={(e) => setSelectedRuleType(e.target.value)}
          >
            <option value="">-- Select a rule --</option>
            <option value="correct_date">Correct Date Format</option>
            <option value="correct_country">Correct Country Spelling</option>
          </select>
        </div>

        {selectedRuleType === 'correct_date' && (
          <div>
            <label htmlFor="date-format" className="block text-sm font-medium text-text-secondary">Target Date Format (e.g., %Y-%m-%d):</label>
            <input
              type="text"
              id="date-format"
              className="mt-1 block w-full border border-input-border bg-input-background rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              placeholder="%Y-%m-%d"
            />
          </div>
        )}

        {selectedRuleType === 'correct_country' && (
          <div>
            <label htmlFor="country-mapping" className="block text-sm font-medium text-text-secondary">Country Mapping (JSON):</label>
            <textarea
              id="country-mapping"
              rows="4"
              className="mt-1 block w-full border border-input-border bg-input-background rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
              value={countryMapping}
              onChange={(e) => setCountryMapping(e.target.value)}
              placeholder='{ "US": "United States", "UK": "United Kingdom" }'
            ></textarea>
          </div>
        )}

        <button
          onClick={() => handleApplyRule(1)}
          className="w-full bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 disabled:bg-gray-400"
          disabled={!fileId || !selectedColumn || !selectedRuleType || loading}
        >
          Apply Rule
        </button>
      </div>
    </div>
  );
};

export default CustomRules;
