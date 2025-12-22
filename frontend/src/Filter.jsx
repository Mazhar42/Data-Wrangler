import React, { useState } from 'react';
import toast from 'react-hot-toast';

const Filter = ({ columns, onApplyFilter, fileId, loading }) => {
  const [column, setColumn] = useState('');
  // Use normalized operator names to match backend and chat schema
  const [operator, setOperator] = useState('greater_than');
  const [compareType, setCompareType] = useState('value');
  const [compareColumn, setCompareColumn] = useState('');
  const [compareValue, setCompareValue] = useState('');

  const handleApplyClick = () => {
    if (!column || !operator) return;

    // Normalize payload to `{ column, operator, value }` or `{ column, operator, compare_column }`
    if (compareType === 'column') {
      if (!compareColumn) return;
      onApplyFilter({
        column,
        operator,
        compare_column: compareColumn,
      });
    } else {
      // value compare
      if (!compareValue && !['is_empty', 'is_not_empty'].includes(operator)) {
        toast.error('Please enter a value to compare.');
        return;
      }
      // Attempt to coerce numeric strings to numbers
      const normalizedValue = (compareValue !== '' && !isNaN(Number(compareValue)))
        ? Number(compareValue)
        : compareValue;
      onApplyFilter({
        column,
        operator,
        value: normalizedValue,
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Filter</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="column" className="block text-sm font-medium text-gray-700">Column</label>
            <select
              id="column"
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">-- Select Column --</option>
              {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="operator" className="block text-sm font-medium text-gray-700">Operator</label>
            <select
              id="operator"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="equal">equal</option>
              <option value="not_equal">not equal</option>
              <option value="greater_than">greater than</option>
              <option value="less_than">less than</option>
              <option value="contains">contains</option>
              <option value="starts_with">starts with</option>
              <option value="ends_with">ends with</option>
              <option value="is_empty">is empty</option>
              <option value="is_not_empty">is not empty</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Compare With</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setCompareType('column')}
                className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${compareType === 'column' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Column
              </button>
              <button
                type="button"
                onClick={() => setCompareType('value')}
                className={`relative -ml-px inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${compareType === 'value' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Value
              </button>
            </div>
          </div>
        </div>
        <div>
          {compareType === 'column' ? (
            <select
              value={compareColumn}
              onChange={(e) => setCompareColumn(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">-- Select Column --</option>
              {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={compareValue}
              onChange={(e) => setCompareValue(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter value"
            />
          )}
        </div>
        <button
          onClick={handleApplyClick}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 disabled:bg-gray-400"
          disabled={!fileId || !column || loading || (compareType === 'column' && !compareColumn) || (compareType === 'value' && !compareValue && !['is_empty', 'is_not_empty'].includes(operator))}
        >
          Apply Filter
        </button>
      </div>
    </div>
  );
};

export default Filter;