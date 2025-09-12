
import { Spinner } from "@/components/Spinner";

interface LoadingStateProps {
  message: string;
}

const LoadingState = ({ message }: LoadingStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner className="w-10 h-10 text-brand-600 mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};

export default LoadingState;
