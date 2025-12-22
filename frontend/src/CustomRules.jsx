import React from 'react';

const CustomRules = ({ allColumns, selectedColumn, setSelectedColumn, selectedRuleType, setSelectedRuleType, dateFormat, setDateFormat, countryMapping, setCountryMapping, handleApplyRule, fileId, loading }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
      <h2 className="text-xl font-semibold mb-4">Apply Custom Rules</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="column-select" className="block text-sm font-medium text-gray-700">Select Column:</label>
          <select
            id="column-select"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
          <label htmlFor="rule-type-select" className="block text-sm font-medium text-gray-700">Select Rule Type:</label>
          <select
            id="rule-type-select"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={selectedRuleType}
            onChange={(e) => setSelectedRuleType(e.target.value)}
          >
            <option value="">-- Select a rule --</option>
            <option value="correct_date">Correct Date Format</option>
            <option value="correct_country">Correct Country Spelling</option>
            <option value="correct_spelling">Correct Spelling (Any Column)</option>
          </select>
        </div>

        {selectedRuleType === 'correct_date' && (
          <div>
            <label htmlFor="date-format" className="block text-sm font-medium text-gray-700">Target Date Format:</label>
            <select
              id="date-format"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
            >
              <option value="">-- Select a format --</option>
              <option value="%Y-%m-%d">YYYY-MM-DD (e.g. 2023-12-31)</option>
              <option value="%d/%m/%Y">DD/MM/YYYY (e.g. 31/12/2023)</option>
              <option value="%m/%d/%Y">MM/DD/YYYY (e.g. 12/31/2023)</option>
              <option value="%d-%m-%Y">DD-MM-YYYY (e.g. 31-12-2023)</option>
              <option value="%Y/%m/%d">YYYY/MM/DD (e.g. 2023/12/31)</option>
              <option value="%d-%b-%Y">DD-Mon-YYYY (e.g. 31-Dec-2023)</option>
            </select>
             <p className="mt-1 text-xs text-gray-500">Select the desired output format for the date.</p>
          </div>
        )}

        {(selectedRuleType === 'correct_country' || selectedRuleType === 'correct_spelling') && (
          <div>
            <label htmlFor="country-mapping" className="block text-sm font-medium text-gray-700">Mapping (JSON):</label>
            <textarea
              id="country-mapping"
              rows="4"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={countryMapping}
              onChange={(e) => setCountryMapping(e.target.value)}
              placeholder='{ "Microsft": "Microsoft", "CA": "Canada", "NY": "New York" }'
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
