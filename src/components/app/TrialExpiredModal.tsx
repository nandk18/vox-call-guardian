import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onDismiss?: () => void;
}

const RAZORPAY_LINK = "https://rzp.io/rzp/gX8IPIVJ";

const TrialExpiredModal = ({ open, onDismiss }: Props) => {
  const handleSubscribe = () => {
    window.open(RAZORPAY_LINK, "_blank");
  };

  const handleLimited = () => {
    localStorage.setItem("trial_dismissed_at", new Date().toISOString());
    toast.message("You have limited access. Subscribe to unlock full features.");
    onDismiss?.();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-card border-border max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-xl">Your free trial has ended</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-center space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">Subscribe to continue using Vox for your business calls.</p>
              <Button onClick={handleSubscribe} className="w-full font-semibold text-base h-12">
                Subscribe — ₹999/month
              </Button>
              <p className="text-xs text-muted-foreground">or ₹599/month billed yearly</p>
              <button
                onClick={handleLimited}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Continue in limited mode →
              </button>
              <p className="text-muted-foreground pt-2" style={{ fontSize: "10px" }}>
                Secured by Razorpay 🔒
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TrialExpiredModal;
