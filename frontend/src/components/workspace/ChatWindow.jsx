import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { filesAPI, chatAPI } from '../../utils/api';
import useHistory from '../../hooks/useHistory';

const ChatWindow = ({ fileId, onCleansingDone, onSuggestion, projectId }) => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages, undo, redo, currentIndex, historyLength] = useHistory([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchConversations = async () => {
            if (projectId && fileId) {
                setLoading(true);
                try {
                    const conversations = await chatAPI.getConversations(projectId, fileId);
                    if (conversations && conversations.length > 0) {
                        const allMessages = conversations
                          .reduce((acc, curr) => acc.concat(curr.messages || []), [])
                          .sort((a, b) => {
                              const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
                              const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
                              return at - bt; // oldest first
                          });
                        setMessages(allMessages, true);
                    } else {
                        // No history, send initial message
                        const data = await chatAPI.sendMessage([], projectId, fileId);
                        if (data.response) {
                            setMessages([{ role: 'assistant', content: data.response }], true);
                        } else {
                            setMessages([{ role: 'assistant', content: 'Unexpected response from chat API.' }], true);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching conversations:', error);
                    toast.error('Failed to load conversation history.');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchConversations();
    }, [projectId, fileId, setMessages]);

    const handleTool = async (tool) => {
        if (!tool || !tool.tool) return;
        const { tool: toolName, parameters = {} } = tool;
        try {
            if (toolName === 'apply_rule') {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Applying rule...', sender: 'ai' }], true);
                const response = await filesAPI.applyRule(fileId, tool);
                toast.success(response.message || 'Rule applied successfully.');
                setMessages(prev => [...prev, { role: 'assistant', content: 'Rule applied successfully.', sender: 'ai' }], true);
                onCleansingDone();
            } else if (toolName === 'apply_filter') {
                const criteria = {
                    column: parameters.column || parameters.column_name,
                    operator: parameters.operator,
                    value: parameters.value,
                };
                setMessages(prev => [...prev, { role: 'assistant', content: 'Applying filter...', sender: 'ai' }], true);
                onSuggestion({ type: 'filter', criteria }, true);
                setMessages(prev => [...prev, { role: 'assistant', content: 'Filter applied successfully.', sender: 'ai' }], true);
            } else if (toolName === 'apply_formula') {
                const formula = {
                    formula_name: parameters.formula_name,
                    formula_expression: parameters.formula_expression,
                };
                setMessages(prev => [...prev, { role: 'assistant', content: 'Applying formula...', sender: 'ai' }], true);
                onSuggestion({ type: 'formula', formula }, true);
                setMessages(prev => [...prev, { role: 'assistant', content: 'Formula applied successfully.', sender: 'ai' }], true);
            } else if (toolName === 'undo') {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Undoing last operation...', sender: 'ai' }], true);
                const response = await filesAPI.undo(fileId);
                toast.success(response.message || 'Last operation undone.');
                setMessages(prev => [...prev, { role: 'assistant', content: 'Undo completed.', sender: 'ai' }], true);
                onCleansingDone();
            } else if (toolName === 'redo') {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Redoing last undone operation...', sender: 'ai' }], true);
                const response = await filesAPI.redo(fileId);
                toast.success(response.message || 'Last undone operation redone.');
                setMessages(prev => [...prev, { role: 'assistant', content: 'Redo completed.', sender: 'ai' }], true);
                onCleansingDone();
            } else if (toolName === 'download') {
                // Download requires current modifications; handled by workspace UI.
                setMessages(prev => [...prev, { role: 'assistant', content: 'To download the cleaned file, use the Download option in the workspace sidebar.', sender: 'ai' }], true);
                toast('Use the Download button to choose format and export.');
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: `Received tool '${toolName}', but this action is not wired yet.`, sender: 'ai' }], true);
            }
        } catch (error) {
            console.error('Error performing tool action:', error);
            const err = error.response?.data?.detail || error.message || 'Failed to perform action.';
            toast.error(err);
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` , sender: 'ai'}], true);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        if (!projectId || !fileId) {
            // Avoid 422 by requiring identifiers
            const warning = { role: 'assistant', content: 'Please select a project and file before chatting.', sender: 'ai' };
            setMessages([...messages, { role: 'user', content: prompt }, warning], true);
            setPrompt('');
            return;
        }

        const userMessage = { role: 'user', content: prompt };
        const chatHistoryWithUserMessage = [...messages, userMessage];

        setPrompt('');
        setLoading(true);

        try {
            const cleanseCommand = /^\/cleanse\s+"([^"]+)"\s+with\s+"([^"]+)"$/;
            const match = prompt.match(cleanseCommand);

            let updatedMessages;

            if (match) {
                const [, column_to_cleanse, user_prompt] = match;

                const response = await filesAPI.cleanseWithAI(fileId, {
                    column_to_cleanse,
                    user_prompt,
                });

                updatedMessages = [...chatHistoryWithUserMessage, { role: 'assistant', content: response.message }];
                toast.success('Data cleansed successfully!');
                onCleansingDone();
            } else {
                const chatHistoryForApi = chatHistoryWithUserMessage
                    .filter(msg => msg && msg.role && msg.content)
                    .map(msg => ({ role: msg.role, content: msg.content }));
                const data = await chatAPI.sendMessage(chatHistoryForApi, projectId, fileId);

                if (data.tool) {
                    // Auto-apply tool and inform the user in plain English
                    await handleTool(data.tool);
                    updatedMessages = chatHistoryWithUserMessage;
                }
                else if (data.suggestion) {
                    onSuggestion(data.suggestion, true);
                    toast.success('Filter applied successfully!');
                    updatedMessages = chatHistoryWithUserMessage;
                } else if (data.response) {
                    updatedMessages = [...chatHistoryWithUserMessage, { role: 'assistant', content: data.response }];
                } else {
                    updatedMessages = [...chatHistoryWithUserMessage, { role: 'assistant', content: 'Unexpected response from chat API.' }];
                }
            }
            setMessages(updatedMessages, true);
        } catch (error) {
            console.error('Error in chat:', error);
            const errorMessage = error.response?.data?.detail || 'An error occurred.';
            setMessages([...chatHistoryWithUserMessage, { role: 'assistant', content: `Error: ${errorMessage}` }], true);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-h-[500px] bg-card-background rounded-2xl shadow-lg">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">AI Assistant</h3>
                <div className="flex gap-2">
                    <button onClick={undo} disabled={currentIndex === 0} className="btn btn-sm">Undo</button>
                    <button onClick={redo} disabled={currentIndex === historyLength - 1} className="btn btn-sm">Redo</button>
                </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
                                {messages.map((msg, index) => (
                                    <div key={index} className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                                        <div className="chat-bubble">
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t">
                                <form onSubmit={handleSubmit}>
                                    <input
                                        type="text"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        className="border p-2 w-full rounded"
                                        placeholder="Type /cleanse or ask a question..."
                                        disabled={loading}
                                    />
                                </form>
                            </div>
                        </div>
                    );
                };
                
                export default ChatWindow;