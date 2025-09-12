
import { CheckCircle, XCircle } from "lucide-react";

interface UrlValidatorProps {
  url: string;
  isValid: boolean;
}

const UrlValidator = ({ url, isValid }: UrlValidatorProps) => {
  if (!url) return null;
  
  return (
    <div className="flex items-center text-sm mt-1">
      {isValid ? (
        <>
          <CheckCircle size={16} className="text-green-500 mr-1" />
          <span className="text-green-600">Valid URL</span>
        </>
      ) : (
        <>
          <XCircle size={16} className="text-red-500 mr-1" />
          <span className="text-red-600">Please enter a valid URL</span>
        </>
      )}
    </div>
  );
};

export default UrlValidator;
