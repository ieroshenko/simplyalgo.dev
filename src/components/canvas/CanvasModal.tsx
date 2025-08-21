import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minimize2, Download, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  componentCode?: string;
  onDownload?: () => void;
  onViewCode?: () => void;
}

export default function CanvasModal({
  isOpen,
  onClose,
  title = "Interactive Component",
  children,
  componentCode,
  onDownload,
  onViewCode,
}: CanvasModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-3 h-3 bg-red-500 rounded-full cursor-pointer hover:bg-red-600"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                />
                <motion.div
                  className="w-3 h-3 bg-yellow-500 rounded-full cursor-pointer hover:bg-yellow-600"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                />
                <motion.div
                  className="w-3 h-3 bg-green-500 rounded-full cursor-pointer hover:bg-green-600"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                />
              </div>

              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>

              <div className="flex items-center gap-2">
                {onViewCode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onViewCode}
                    className="h-8 w-8 p-0"
                  >
                    <Code2 className="h-4 w-4" />
                  </Button>
                )}
                {onDownload && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDownload}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
