import React from 'react';
import { Bot, User, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const PlanStep = ({ step }) => (
  <div className="p-2 bg-indigo-50 rounded-md mb-2 text-sm">
    <p className="font-semibold text-indigo-800">Action: <span className="font-normal bg-indigo-100 px-1 rounded">{step.action}</span></p>
    <ul className="list-disc list-inside pl-2 mt-1 text-indigo-700">
      {Object.entries(step).map(([key, value]) => {
        if (key !== 'action') {
          return <li key={key}><strong>{key}:</strong> {String(value)}</li>;
        }
        return null;
      })}
    </ul>
  </div>
);

const Message = ({ message, onApplyPlan }) => {
  const isUser = message.role === 'user';
  const isPlan = message.type === 'plan';

  if (!message.content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <Bot className="w-8 h-8 text-indigo-500 flex-shrink-0 mt-1" />}
      <div className={`p-4 rounded-lg max-w-2xl shadow-sm ${isUser ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
        {isPlan ? (
          <div>
            <p className="font-semibold mb-3">I&apos;ve created a plan based on your request. Please review and approve:</p>
            <div className="space-y-2">
              {message.content.map((step, index) => (
                <PlanStep key={index} step={step} />
              ))}
            </div>
            <button 
              onClick={() => onApplyPlan(message.content)}
              className="mt-4 w-full flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Apply Plan
            </button>
          </div>
        ) : (
          <p>{message.content}</p>
        )}
      </div>
      {isUser && <User className="w-8 h-8 text-gray-400 flex-shrink-0 mt-1" />}
    </motion.div>
  );
};

export default Message;
