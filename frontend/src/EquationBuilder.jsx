import React, { useState } from 'react';
import toast from 'react-hot-toast';

const EquationBuilder = ({ columns, onApplyFormula, fileId, loading, savedFormulas }) => {
  const [formulaName, setFormulaName] = useState('');
  const [formulaExpression, setFormulaExpression] = useState('');

  const handleColumnClick = (col) => {
    setFormulaExpression(formulaExpression + col);
  };

  const handleOperatorClick = (op) => {
    setFormulaExpression(formulaExpression + op);
  };

  const handleApplyClick = () => {
    if (formulaName && formulaExpression) {
      onApplyFormula(formulaName, formulaExpression);
    }
  };

  const handleSaveFormula = () => {
    if (formulaName && formulaExpression) {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
      fetch(`${BACKEND_URL}/formulas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: formulaName, expression: formulaExpression }),
      })
        .then(response => response.json())
        .then(() => {
          toast.success('Formula saved successfully!');
        });
    }
  };

  const handleSelectFormula = (e) => {
    const selectedFormula = savedFormulas.find(f => f.id === parseInt(e.target.value));
    if (selectedFormula) {
      setFormulaName(selectedFormula.name);
      setFormulaExpression(selectedFormula.expression);
    }
  };

  return (
    <div className={`bg-card-background p-6 rounded-lg shadow-md mt-8 ${!fileId ? 'opacity-50 pointer-events-none' : ''}`}>
      <h2 className="text-xl font-semibold mb-4">Equation Builder</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="saved-formulas" className="block text-sm font-medium text-text-secondary">Saved Formulas:</label>
          <select
            id="saved-formulas"
            className="mt-1 block w-full border border-input-border bg-input-background rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            onChange={handleSelectFormula}
          >
            <option value="">-- Select a formula --</option>
            {savedFormulas.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="formula-name" className="block text-sm font-medium text-text-secondary">New Column Name:</label>
          <input
            type="text"
            id="formula-name"
            className="mt-1 block w-full border border-input-border bg-input-background rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            value={formulaName}
            onChange={(e) => setFormulaName(e.target.value)}
            placeholder="e.g., total_revenue"
          />
        </div>
        <div>
          <label htmlFor="formula-expression" className="block text-sm font-medium text-text-secondary">Formula Expression:</label>
          <textarea
            id="formula-expression"
            rows="3"
            className="mt-1 block w-full border border-input-border bg-input-background rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
            value={formulaExpression}
            onChange={(e) => setFormulaExpression(e.target.value)}
            placeholder="e.g., column1 * column2"
          ></textarea>
        </div>
        <div className="flex flex-wrap gap-2">
          {columns.map((col) => (
            <button
              key={col}
              onClick={() => handleColumnClick(col)}
              className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm hover:bg-gray-300"
            >
              {col}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {['+', '-', '*', '/'].map((op) => (
            <button
              key={op}
              onClick={() => handleOperatorClick(op)}
              className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm hover:bg-gray-300"
            >
              {op}
            </button>
          ))}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleApplyClick}
            className="w-full bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 disabled:bg-gray-400"
            disabled={!fileId || !formulaName || !formulaExpression || loading}
          >
            Apply Formula
          </button>
          <button
            onClick={handleSaveFormula}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 disabled:bg-gray-400"
            disabled={!formulaName || !formulaExpression || loading}
          >
            Save Formula
          </button>
        </div>
      </div>
    </div>
  );
};

export default EquationBuilder;
