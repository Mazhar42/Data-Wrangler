import React from 'react';
import { motion } from 'framer-motion';
import { Play, Filter, Plus, Download, Undo, Redo, Trash2, Sparkles, Search, Save } from 'lucide-react';

const Sidebar = ({ onApplyRule, onApplyFilter, onApplyFormula, onDownload, onUndo, onRedo, onClearAll, onAiCleanse, onSave }) => {
  const buttonClasses = "w-full flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 font-roboto";

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
      <h2 className="text-2xl font-roboto font-extralight mb-6 text-gray-400">Operations</h2>
      <div className="space-y-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onApplyRule}
          className={buttonClasses}
        >
          <div className="w-8 h-8 rounded-full border border-blue-500 flex items-center justify-center mr-3">
            <Play size={16} className="text-blue-500" />
          </div>
          Apply Rule
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onApplyFilter}
          className={buttonClasses}
        >
          <div className="w-8 h-8 rounded-full border border-blue-500 flex items-center justify-center mr-3">
            <Filter size={16} className="text-blue-500" />
          </div>
          Apply Filter
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onApplyFormula}
          className={buttonClasses}
        >
          <div className="w-8 h-8 rounded-full border border-blue-500 flex items-center justify-center mr-3">
            <Plus size={16} className="text-blue-500" />
          </div>
          Apply Formula
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAiCleanse}
          className={buttonClasses}
        >
          <div className="w-8 h-8 rounded-full border border-purple-500 flex items-center justify-center mr-3">
            <Sparkles size={16} className="text-purple-500" />
          </div>
          AI Spelling Correction
        </motion.button>
        
        {/* <motion.button
          onClick={onDetectAnomalies}
          className={buttonClasses}
        >
          <div className="w-8 h-8 rounded-full border border-indigo-500 flex items-center justify-center mr-3">
            <Search size={16} className="text-indigo-500" />
          </div>
          Detect Anomalies
        </motion.button> */}
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            console.log("Save button clicked");
            onSave();
          }}
          className={buttonClasses}
        >
          <div className="w-8 h-8 rounded-full border border-green-500 flex items-center justify-center mr-3">
            <Save size={16} className="text-green-500" />
          </div>
          Save Changes
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDownload}
          className={buttonClasses}
        >
          <div className="w-8 h-8 rounded-full border border-green-500 flex items-center justify-center mr-3">
            <Download size={16} className="text-green-500" />
          </div>
          Download
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onUndo}
          className={buttonClasses}
        >
          <div className="w-8 h-8 rounded-full border border-yellow-500 flex items-center justify-center mr-3">
            <Undo size={16} className="text-yellow-500" />
          </div>
          Undo
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRedo}
          className={buttonClasses}
        >
          <div className="w-8 h-8 rounded-full border border-blue-500 flex items-center justify-center mr-3">
            <Redo size={16} className="text-blue-500" />
          </div>
          Redo
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClearAll}
          className={`${buttonClasses} text-red-500 hover:bg-red-50`}
        >
          <div className="w-8 h-8 rounded-full border border-red-500 flex items-center justify-center mr-3">
            <Trash2 size={16} className="text-red-500" />
          </div>
          Clear All
        </motion.button>
      </div>
    </div>
  );
};

export default Sidebar;