import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { chatAPI } from '../../utils/api';

const ChatWindow = ({ onCleansingDone, onSuggestion, isOpen, onClose, onDownload, allColumns, projectId, fileId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Conversational-only: remove options UI/state; keep prompts conversational
  const [isAwaitingFormula, setIsAwaitingFormula] = useState(false);
  const [formulaName, setFormulaName] = useState('');
  const [formulaExpression, setFormulaExpression] = useState('');
  const [isAwaitingDateRule, setIsAwaitingDateRule] = useState(false);
  const [dateColumn, setDateColumn] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [isAwaitingFilter, setIsAwaitingFilter] = useState(false);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOperator, setFilterOperator] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log('fileId:', fileId);
    const fetchConversations = async () => {
        if (isOpen && projectId && fileId) {
            setLoading(true);
            try {
                const conversations = await chatAPI.getConversations(projectId, fileId);
                if (conversations && conversations.length > 0) {
                    const allMessages = conversations
                      .reduce((acc, curr) => acc.concat(curr.messages || []), [])
                      .sort((a, b) => {
                        const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
                        const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
                        return at - bt; // oldest first for natural reading order
                      });
                    setMessages(allMessages);
                }
            } catch (error) {
                console.error('Failed to fetch conversations:', error);
            } finally {
                setLoading(false);
            }
        }
    };
    fetchConversations();
  }, [isOpen, projectId, fileId]);

  const handleSend = async (isInitial = false, message = null) => {
    const messageToSend = message || input.trim();
    if (messageToSend) {
      if (!projectId || !fileId) {
        // Guard against missing identifiers to avoid 422
        const notice = { role: 'assistant', content: 'Please select a project and file before using the assistant.', sender: 'ai' };
        setMessages([...messages, { role: 'user', content: messageToSend, sender: 'user' }, notice]);
        setInput('');
        return;
      }
      const userMessage = { role: 'user', content: messageToSend, sender: 'user' };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      setLoading(true);
      try {
        const messagesForApi = newMessages.map(({ role, content }) => ({ role, content }));
        const response = await chatAPI.sendMessage(messagesForApi, projectId, fileId);

        let aiMessage;
        // Prefer structured tool suggestions from backend for human-in-the-loop UX
        if (response.tool) {
          const { tool, parameters } = response.tool || {};
          if (tool === 'apply_rule') {
            const rule = {
              type: 'rule',
              rule: {
                column_name: parameters?.column_name,
                rule_type: parameters?.rule_type,
                payload: parameters?.payload || (parameters?.mapping ? { mapping: parameters?.mapping } : {}),
              },
            };
            // Auto-apply suggestion, narrate conversationally
            onSuggestion && onSuggestion(rule, true);
            aiMessage = { role: 'assistant', content: 'I’ve applied the cleansing rule to your data.', sender: 'ai' };
          } else if (tool === 'apply_filter') {
            const suggestion = {
              type: 'filter',
              criteria: {
                column: parameters?.column,
                operator: parameters?.operator,
                value: parameters?.value,
              },
            };
            onSuggestion && onSuggestion(suggestion, true);
            aiMessage = { role: 'assistant', content: 'Filter applied. Your dataset is updated accordingly.', sender: 'ai' };
          } else if (tool === 'apply_formula') {
            const suggestion = {
              type: 'formula',
              formula: {
                formula_name: parameters?.formula_name,
                formula_expression: parameters?.formula_expression,
              },
            };
            onSuggestion && onSuggestion(suggestion, true);
            aiMessage = { role: 'assistant', content: 'Done. I created the column using your formula.', sender: 'ai' };
          } else {
            aiMessage = { role: 'assistant', content: response.response || 'I have a suggestion for you.', sender: 'ai' };
          }
        } else if (response.response) {
          try {
            let jsonResponse;
            if (response.response.includes('{') && response.response.includes('}')) {
                const jsonString = response.response.substring(response.response.indexOf('{'), response.response.lastIndexOf('}') + 1);
                jsonResponse = JSON.parse(jsonString);
            } else {
                jsonResponse = JSON.parse(response.response);
            }

            // Normalize older/newer shapes and convert tool JSON into a friendly suggestion card
            if (jsonResponse.tool) {
              const tool = jsonResponse.tool;
              const params = jsonResponse.parameters || {};
              // Backward-compat: some models emit 'payload_mapping' instead of nested payload
              if (params.payload_mapping && !params.payload) {
                params.payload = { mapping: params.payload_mapping };
              }

              if (tool === 'apply_rule') {
                const rule = {
                  type: 'rule',
                  rule: {
                    column_name: params.column_name,
                    rule_type: params.rule_type,
                    payload: params.payload || (params.mapping ? { mapping: params.mapping } : {}),
                  },
                };
                onSuggestion && onSuggestion(rule, true);
                aiMessage = { role: 'assistant', content: 'I applied the cleansing rule you described.', sender: 'ai' };
              } else if (tool === 'apply_filter') {
                const suggestion = {
                  type: 'filter',
                  criteria: {
                    column: params.column,
                    operator: params.operator,
                    value: params.value,
                  },
                };
                onSuggestion && onSuggestion(suggestion, true);
                aiMessage = { role: 'assistant', content: 'Filter applied to your data as requested.', sender: 'ai' };
              } else if (tool === 'apply_formula') {
                const suggestion = {
                  type: 'formula',
                  formula: {
                    formula_name: params.formula_name,
                    formula_expression: params.formula_expression,
                  },
                };
                onSuggestion && onSuggestion(suggestion, true);
                aiMessage = { role: 'assistant', content: 'Your formula has been applied and the new column is ready.', sender: 'ai' };
              } else if (tool === 'undo' || tool === 'redo' || tool === 'save_changes' || tool === 'download') {
                // Perform simple actions conversationally where possible
                if (tool === 'undo' || tool === 'redo') {
                  onSuggestion && onSuggestion({ type: tool, parameters: params }, true);
                  aiMessage = { role: 'assistant', content: tool === 'undo' ? 'I’ve undone the last change.' : 'I’ve redone the last change.', sender: 'ai' };
                } else if (tool === 'save_changes') {
                  onCleansingDone && onCleansingDone('save');
                  aiMessage = { role: 'assistant', content: 'All changes have been saved.', sender: 'ai' };
                } else {
                  aiMessage = { role: 'assistant', content: 'You can download from the workspace sidebar. I’ll guide you as needed.', sender: 'ai' };
                }
              } else {
                aiMessage = { role: 'assistant', content: 'I have a suggestion for you.', sender: 'ai' };
              }
            } else if (jsonResponse.type === 'filter' || jsonResponse.type === 'formula') {
              // Auto-apply structured suggestions
              onSuggestion && onSuggestion(jsonResponse, true);
              aiMessage = { role: 'assistant', content: 'I applied your request.', sender: 'ai' };
            } else if (jsonResponse.type === 'options') {
              // Conversational-only: no option lists, just helpful guidance
              aiMessage = { role: 'assistant', content: 'Tell me in plain English what you’d like done, and I’ll take care of it.', sender: 'ai' };
            } else if (jsonResponse.type === 'correct_date_form') {
                aiMessage = {
                  role: 'assistant',
                  content: 'Please select the column and provide the date format.',
                  sender: 'ai',
                  type: 'correct_date_form'
                };
            } else if (jsonResponse.type === 'filter_form') {
                aiMessage = {
                  role: 'assistant',
                  content: 'Please select the column, operator, and value for the filter.',
                  sender: 'ai',
                  type: 'filter_form'
                };
            } else {
                aiMessage = { role: 'assistant', content: response.response, sender: 'ai' };
            }
          } catch (error) {
            aiMessage = { role: 'assistant', content: response.response, sender: 'ai' };
          }
        } else {
          aiMessage = { role: 'assistant', content: 'No response from AI.', sender: 'ai' };
        }
        setMessages([...newMessages, aiMessage]);

        // If backend performed an action, refresh workspace data
        if (response.cleansing_done) {
            onCleansingDone();
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        setMessages([...newMessages, { text: 'Error: Could not get a response.', sender: 'ai' }]);
      }
      setLoading(false);
    }
  };

  // Conversational-only: suggestions auto-apply directly (handled above)

  const handleDateRuleSubmit = () => {
    const rule = {
      type: 'rule',
      rule: {
        column_name: dateColumn,
        rule_type: 'correct_date',
        payload: {
          target_format: dateFormat,
        },
      },
    };
    onSuggestion(rule, true);
    setIsAwaitingDateRule(false);
    setDateColumn('');
    setDateFormat('');
    const filtered = messages.filter(msg => msg.type !== 'correct_date_form');
    setMessages([
      ...filtered,
      { role: 'assistant', sender: 'ai', content: 'Correct Date format rule has been applied successfully.' },
      {
        role: 'assistant',
        sender: 'ai',
        type: 'options',
        content: optionsPrompt || 'Hello! I can help you cleanse your data. What would you like to do?',
        options: optionsTemplate || [
          { label: 'Download CSV', value: 'download_csv' },
          { label: 'Download Excel', value: 'download_excel' },
          { label: 'Save Changes', value: 'save_changes' },
          { label: 'Clear All Modifications', value: 'clear_all' },
          { label: 'Apply Formula', value: 'apply_formula' },
          { label: 'Correct Date Format', value: 'correct_date_rule' },
          { label: 'Apply Filter', value: 'apply_filter' },
        ],
      },
    ]);
  };

  const handleFilterSubmit = () => {
    const filter = {
      type: 'filter',
      criteria: {
        column: filterColumn,
        operator: filterOperator,
        value: filterValue,
      },
    };
    onSuggestion(filter, true);
    setIsAwaitingFilter(false);
    setFilterColumn('');
    setFilterOperator('');
    setFilterValue('');
    const filtered = messages.filter(msg => msg.type !== 'filter_form');
    setMessages([
      ...filtered,
      { role: 'assistant', sender: 'ai', content: 'Filter has been applied successfully.' },
      {
        role: 'assistant',
        sender: 'ai',
        type: 'options',
        content: optionsPrompt || 'Hello! I can help you cleanse your data. What would you like to do?',
        options: optionsTemplate || [
          { label: 'Download CSV', value: 'download_csv' },
          { label: 'Download Excel', value: 'download_excel' },
          { label: 'Save Changes', value: 'save_changes' },
          { label: 'Clear All Modifications', value: 'clear_all' },
          { label: 'Apply Formula', value: 'apply_formula' },
          { label: 'Correct Date Format', value: 'correct_date_rule' },
          { label: 'Apply Filter', value: 'apply_filter' },
        ],
      },
    ]);
  };

  // No option click handlers in conversational-only mode

  const handleFormulaSubmit = () => {
    const message = `formula name: ${formulaName}, formula expression: ${formulaExpression}`;
    handleSend(false, message);
    setIsAwaitingFormula(false);
    setFormulaName('');
    setFormulaExpression('');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-24 right-6 w-[640px] max-w-[90vw] h-[640px] max-h-[80vh] bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-xl flex flex-col z-50"
    >
      <div className="p-4 bg-white/80 text-gray-900 rounded-t-2xl border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold">Chat with AI</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          &times;
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg, index) => {
          const text = msg.content || msg.text;
          if (msg.type === 'formula_form') {
            return (
              <div key={index} className="my-1 p-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900">
                <p className="text-sm mb-2">{text}</p>
                <div className="mt-2">
                  <input
                    type="text"
                    value={formulaName}
                    onChange={(e) => setFormulaName(e.target.value)}
                    className="w-full bg-input-background border border-input-border rounded-xl px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="New column name"
                  />
                  <input
                    type="text"
                    value={formulaExpression}
                    onChange={(e) => setFormulaExpression(e.target.value)}
                    className="w-full bg-input-background border border-input-border rounded-xl px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Formula expression"
                  />
                  <button
                    onClick={handleFormulaSubmit}
                    className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            );
          } else if (msg.type === 'correct_date_form') {
            return (
                <div key={index} className="my-1 p-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900">
                    <p className="text-sm mb-2">{text}</p>
                    <div className="mt-2">
                        <select
                            value={dateColumn}
                            onChange={(e) => setDateColumn(e.target.value)}
                            className="w-full bg-input-background border border-input-border rounded-xl px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">-- Select a column --</option>
                            {allColumns.map((col) => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={dateFormat}
                            onChange={(e) => setDateFormat(e.target.value)}
                            className="w-full bg-input-background border border-input-border rounded-xl px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Target Date Format (e.g., %Y-%m-%d)"
                        />
                        <button
                            onClick={handleDateRuleSubmit}
                            className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            );
          } else if (msg.type === 'filter_form') {
            return (
                <div key={index} className="my-1 p-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900">
                    <p className="text-sm mb-2">{text}</p>
                    <div className="mt-2">
                        <select
                            value={filterColumn}
                            onChange={(e) => setFilterColumn(e.target.value)}
                            className="w-full bg-input-background border border-input-border rounded-xl px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">-- Select a column --</option>
                            {allColumns.map((col) => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                        <select
                            value={filterOperator}
                            onChange={(e) => setFilterOperator(e.target.value)}
                            className="w-full bg-input-background border border-input-border rounded-xl px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">-- Select an operator --</option>
                            <option value="equal">Equal</option>
                            <option value="not_equal">Not Equal</option>
                            <option value="greater_than">Greater Than</option>
                            <option value="less_than">Less Than</option>
                            <option value="contains">Contains</option>
                            <option value="starts_with">Starts With</option>
                            <option value="ends_with">Ends With</option>
                        </select>
                        <input
                            type="text"
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="w-full bg-input-background border border-input-border rounded-xl px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Value"
                        />
                        <button
                            onClick={handleFilterSubmit}
                            className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            );
          }
          return (
            <div
              key={index}
              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm ${msg.sender === 'user' ? 'self-end bg-indigo-600 text-white' : 'self-start bg-gray-100 text-gray-900 border border-gray-200'}`}
            >
              {text}
            </div>
          );
        })}
        {loading && <div className="my-1 p-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-500">Thinking…</div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-200 bg-white/80 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-input-background border border-input-border rounded-xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Type a message…"
        />
        <button onClick={() => handleSend()} className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
          <Send size={20} />
        </button>
      </div>
    </motion.div>
  );
};

export default ChatWindow;