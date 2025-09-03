import React, { useState } from 'react';
import toast from 'react-hot-toast';

const Filter = ({ columns, onApplyFilter, fileId, loading }) => {
  const [column, setColumn] = useState('');
  const [operator, setOperator] = useState('>');
  const [compareType, setCompareType] = useState('column');
  const [compareColumn, setCompareColumn] = useState('');
  const [compareValue, setCompareValue] = useState('');

  const handleApplyClick = () => {
    if (column && operator) {
      if (compareType === 'column' && compareColumn) {
        onApplyFilter({
          column,
          operator,
          compareTarget: { type: 'column', value: compareColumn },
        });
      } else if (compareType === 'value') {
        if (compareValue || ['is_empty', 'is_not_empty'].includes(operator)) {
            onApplyFilter({
                column,
                operator,
                compareTarget: { type: 'value', value: compareValue },
            });
        } else {
            toast.error('Please enter a value to compare.');
        }
      }
    }
  };

  return (
    <div className="bg-card-background p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Filter</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="column" className="block text-sm font-medium text-text-secondary">Column</label>
            <select
              id="column"
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              className="mt-1 block w-full border border-input-border bg-input-background rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            >
              <option value="">-- Select Column --</option>
              {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="operator" className="block text-sm font-medium text-text-secondary">Operator</label>
            <select
              id="operator"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="mt-1 block w-full border border-input-border bg-input-background rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            >
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value="==">==</option>
              <option value="!=">!=</option>
              <option value=">=">&gt;=</option>
              <option value="<=">&lt;=</option>
              <option value="contains">contains</option>
              <option value="not_contains">does not contain</option>
              <option value="starts_with">starts with</option>
              <option value="ends_with">ends with</option>
              <option value="is_empty">is empty</option>
              <option value="is_not_empty">is not empty</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary">Compare With</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setCompareType('column')}
                className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${compareType === 'column' ? 'bg-violet-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Column
              </button>
              <button
                type="button"
                onClick={() => setCompareType('value')}
                className={`relative -ml-px inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${compareType === 'value' ? 'bg-violet-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
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
              className="mt-1 block w-full border border-input-border bg-input-background rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            >
              <option value="">-- Select Column --</option>
              {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={compareValue}
              onChange={(e) => setCompareValue(e.target.value)}
              className="mt-1 block w-full border border-input-border bg-input-background rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
              placeholder="Enter value"
            />
          )}
        </div>
        <button
          onClick={handleApplyClick}
          className="w-full bg-purple-500 text-white px-4 py-2 rounded-full hover:bg-purple-600 disabled:bg-gray-400"
          disabled={!fileId || !column || loading || (compareType === 'column' && !compareColumn) || (compareType === 'value' && !compareValue && !['is_empty', 'is_not_empty'].includes(operator))}
        >
          Apply Filter
        </button>
      </div>
    </div>
  );
};

export default Filter;