import React from 'react';

interface CommentFormProps {
  comments: string;
  onCommentsChange: (comments: string) => void;
}

const CommentForm: React.FC<CommentFormProps> = ({
  comments,
  onCommentsChange
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-black mb-3">
          Комментарий
        </label>
        <textarea
          placeholder="Ваше сообщение..."
          value={comments}
          onChange={(e) => onCommentsChange(e.target.value)}
          className="w-full h-32 p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none text-black"
          maxLength={500}
        />
      </div>
    </div>
  );
};

export default CommentForm;