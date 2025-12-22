import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

const ChatButton = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-5 right-5 bg-blue-500 text-white p-4 rounded-full shadow-lg z-50"
    >
      <MessageSquare size={24} />
    </motion.button>
  );
};

export default ChatButton;
