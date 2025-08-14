import { useState, useEffect } from 'react';
import DataTable from './DataTable';
import EquationBuilder from './EquationBuilder';

function App() {
  const [file, setFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [allColumns, setAllColumns] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedRuleType, setSelectedRuleType] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [countryMapping, setCountryMapping] = useState('');
  const [originalData, setOriginalData] = useState([]);
  const [cleanedData, setCleanedData] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [originalDataTotalRows, setOriginalDataTotalRows] = useState(0);
  const [cleanedDataTotalRows, setCleanedDataTotalRows] = useState(0);
  const [currentOriginalPage, setCurrentOriginalPage] = useState(1);
  const [currentCleanedPage, setCurrentCleanedPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [cleanedDataSource, setCleanedDataSource] = useState(null);

  const [lastAppliedFormula, setLastAppliedFormula] = useState(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };

  const handlePreview = async (page = 1) => {
    if (!fileId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/files/${fileId}?page=${page}&per_page=${itemsPerPage}`);
      if (!response.ok) {
        const errData = await response.json();
        setError(errData.detail || 'Failed to fetch data');
        setLoading(false);
        return;
      }
      const data = await response.json();
      setOriginalData(data.data);
      setOriginalDataTotalRows(data.total_rows);
      setCurrentOriginalPage(page);
      setCleanedData([]); // Clear previous cleaned data
      setCleanedDataSource(null);
    } catch (error) {
      setError('An unexpected error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRule = async (page = 1) => {
    if (!fileId || !selectedColumn || !selectedRuleType) return;

    setLoading(true);
    setError(null);
    setCleanedDataSource('rule');

    let payload = {};
    if (selectedRuleType === 'correct_date') {
      payload = { target_format: dateFormat || '%Y-%m-%d' };
    } else if (selectedRuleType === 'correct_country') {
      try {
        payload = { mapping: countryMapping ? JSON.parse(countryMapping) : null };
      } catch (e) {
        setError('Invalid JSON for country mapping.');
        setLoading(false);
        return;
      }
    }

    const cleansingRequest = {
      column_rules: [
        {
          column_name: selectedColumn,
          rule_type: selectedRuleType,
          payload: payload,
          active: true,
        },
      ],
      waterfall_rules: [], // Not implemented yet
      page: page,
      per_page: itemsPerPage,
    };

    try {
      const response = await fetch(`http://localhost:8000/files/${fileId}/clean`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleansingRequest),
      });

      if (!response.ok) {
        const errData = await response.json();
        setError(errData.detail || 'Failed to apply rule');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setCleanedData(data.preview);
      setCleanedDataTotalRows(data.total_rows);
      setCurrentCleanedPage(page);
      alert('Rule applied successfully!');
    } catch (error) {
      setError('An unexpected error occurred while applying rule.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFormula = async (formulaName, formulaExpression, page = 1) => {
    if (!fileId) return;
    setLoading(true);
    setError(null);
    setCleanedDataSource('formula');
    setLastAppliedFormula({ formulaName, formulaExpression });
    try {
      const response = await fetch(`http://localhost:8000/files/${fileId}/apply_formula`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formula_name: formulaName,
          formula_expression: formulaExpression,
          page: page,
          per_page: itemsPerPage,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        setError(errData.detail || 'Failed to apply formula');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setCleanedData(data.data);
      setCleanedDataTotalRows(data.total_rows);
      setCurrentCleanedPage(page);
      alert('Formula applied successfully!');
    } catch (error) {
      setError('An unexpected error occurred while applying formula.');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanedPageChange = (page) => {
    if (cleanedDataSource === 'rule') {
      handleApplyRule(page);
    } else if (cleanedDataSource === 'formula') {
      if (lastAppliedFormula) {
        handleApplyFormula(lastAppliedFormula.formulaName, lastAppliedFormula.formulaExpression, page);
      }
    }
  };

  const handleDownload = async () => {
    if (!fileId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/cleaned-file/${fileId}`);
      if (!response.ok) {
        const errData = await response.json();
        setError(errData.detail || 'Failed to download cleaned file');
        setLoading(false);
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cleaned_data_${fileId}.xlsx`; // You might want a more dynamic name
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('An unexpected error occurred during download.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        setError(errData.detail || 'Upload failed');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setFileId(data.file_id);
      setOriginalData([]);
      setCleanedData([]);
      setOriginalDataTotalRows(0);
      setCleanedDataTotalRows(0);
      setCurrentOriginalPage(1);
      setCurrentCleanedPage(1);
      setSelectedColumn('');
      setSelectedRuleType('');
      setCleanedDataSource(null);
      setLastAppliedFormula(null);

      // fetch columns
      const colsResponse = await fetch(`http://localhost:8000/unique-columns/${data.file_id}`);
      if (!colsResponse.ok) {
        const errData = await colsResponse.json();
        setError(errData.detail || 'Could not fetch columns');
        setLoading(false);
        return;
      }

      const colsData = await colsResponse.json();
      setAllColumns(colsData.all_columns || []);
    } catch (error) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="bg-header-background shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Data Cleansing Tool</h1>
          <button onClick={toggleTheme} className="bg-button-background text-button-text px-4 py-2 rounded-full">
            {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1">
          {/* Left Column: File Upload and Columns */}

            <div className="bg-card-background p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Step 1 : Upload File</h2>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />
                <button
                  onClick={handleUpload}
                  className="bg-button-background text-button-text px-4 py-2 rounded-full hover:bg-violet-600 disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Upload'
                  )}
                </button>
                <button
                  onClick={() => handlePreview(1)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 disabled:bg-gray-400"
                  disabled={!fileId || loading}
                >
                  Preview
                </button>
              </div>
              {error && <p className="text-red-500 mt-2">{error}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="col-span-1 md:col-span-2">
                <DataTable
                  title="Original Data Preview"
                  data={originalData}
                  theme={theme}
                  totalRows={originalDataTotalRows}
                  currentPage={currentOriginalPage}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePreview}
                />
              </div>
            </div>
            
            {/* <div className="bg-card-background p-6 rounded-lg shadow-md mt-8">
              <h2 className="text-xl font-semibold mb-4">2. All Columns</h2>
              <div className="space-y-2">
                {allColumns.map((col) => (
                  <div key={col} className="flex items-center justify-between">
                    <span>{col}</span>
                  </div>
                ))}
                {allColumns.length === 0 && (
                  <p className="text-text-secondary">Upload a file to see all columns.</p>
                )}
              </div>
            </div> */}

          {/* Right Column: AI Suggestions and Download */}
          
            <h2 className="text-xl font-semibold mb-4">Step 2 : Equation Builder</h2>
            <EquationBuilder
              columns={allColumns}
              onApplyFormula={handleApplyFormula}
              fileId={fileId}
              loading={loading}
            />
            <div className="bg-card-background p-6 rounded-lg shadow-md mt-8">
              <h2 className="text-xl font-semibold mb-4">Step 3 : Apply Custom Rules</h2>
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
          </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <div className="col-span-1 md:col-span-2">
            <DataTable
              title="Cleaned Data Preview"
              data={cleanedData}
              theme={theme}
              totalRows={cleanedDataTotalRows}
              currentPage={currentCleanedPage}
              itemsPerPage={itemsPerPage}
              onPageChange={handleCleanedPageChange}
            />
          </div>
        </div>

        <div className="bg-card-background p-6 rounded-lg shadow-md mt-8">
              <h2 className="text-xl font-semibold mb-4">Step 4 : Download Cleaned File</h2>
              <button
                onClick={handleDownload}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 disabled:bg-gray-400"
                disabled={!fileId || loading}
              >
                Download
              </button>
            </div>
      </main>
    </div>
  );
}

export default App;
