import { useState, useCallback } from 'react';

const useHistory = (initialState) => {
    const [history, setHistory] = useState([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const setState = useCallback((newState, overwrite = false) => {
        if (overwrite) {
            const newHistory = history.slice(0, currentIndex + 1);
            setHistory([...newHistory, newState]);
            setCurrentIndex(newHistory.length);
        } else {
            setHistory(prevHistory => {
                const newHistory = prevHistory.slice(0, currentIndex + 1);
                const updatedState = typeof newState === 'function' ? newState(prevHistory[currentIndex]) : newState;
                return [...newHistory, updatedState];
            });
            setCurrentIndex(prevIndex => prevIndex + 1);
        }
    }, [currentIndex, history]);

    const undo = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prevIndex => prevIndex - 1);
        }
    }, [currentIndex]);

    const redo = useCallback(() => {
        if (currentIndex < history.length - 1) {
            setCurrentIndex(prevIndex => prevIndex + 1);
        }
    }, [currentIndex, history.length]);

    return [history[currentIndex], setState, undo, redo, currentIndex, history.length];
};

export default useHistory;
