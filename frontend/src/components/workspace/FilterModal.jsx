import React from 'react';
import { motion } from 'framer-motion';
import Filter from '../../Filter';

const FilterModal = ({ isOpen, onClose, columns, onApplyFilter, fileId, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg"
      >
        <Filter
          columns={columns}
          onApplyFilter={onApplyFilter}
          fileId={fileId}
          loading={loading}
        />
        <button onClick={onClose} className="mt-4 w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-full hover:bg-gray-300">
          Close
        </button>
      </motion.div>
    </div>
  );
};

export default FilterModal;
