import React from 'react';
import { motion } from 'framer-motion';
import EquationBuilder from '../../EquationBuilder';

const EquationBuilderModal = ({ isOpen, onClose, columns, onApplyFormula, fileId, loading, savedFormulas, projectId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg"
      >
        <EquationBuilder
          columns={columns}
          onApplyFormula={onApplyFormula}
          fileId={fileId}
          loading={loading}
          savedFormulas={savedFormulas}
          projectId={projectId}
        />
        <button onClick={onClose} className="mt-4 w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-full hover:bg-gray-300">
          Close
        </button>
      </motion.div>
    </div>
  );
};

export default EquationBuilderModal;
