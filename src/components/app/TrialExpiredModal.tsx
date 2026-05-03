import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  PlanToggle,
  PriceDisplay,
  SubscribeButton,
  useBillingCycle,
} from "./PlanToggle";

interface Props {
  open: boolean;
  onDismiss?: () => void;
}

const TrialExpiredModal = ({ open, onDismiss }: Props) => {
  const [cycle, setCycle] = useBillingCycle("yearly");

  const handleLimited = () => {
    localStorage.setItem("trial_dismissed_at", new Date().toISOString());
    toast.message("Limited access mode. Subscribe to unlock all features.");
    onDismiss?.();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-card border-border max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-xl">
            Your free trial has ended
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground text-center">
                Subscribe to continue using Vox for your business calls.
              </p>

              <PlanToggle value={cycle} onChange={setCycle} />
              <PriceDisplay cycle={cycle} />
              <SubscribeButton cycle={cycle} />

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>✓ Cancel anytime</span>
                <span>✓ Setup in 5 minutes</span>
                <span>✓ No credit card lock-in</span>
              </div>

              <p className="text-muted-foreground text-center" style={{ fontSize: "10px" }}>
                Secured by Razorpay 🔒
              </p>

              <div className="text-center">
                <button
                  onClick={handleLimited}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Continue in limited mode →
                </button>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TrialExpiredModal;
