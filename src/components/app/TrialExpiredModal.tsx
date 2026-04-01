import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
}

const TrialExpiredModal = ({ open }: Props) => (
  <AlertDialog open={open}>
    <AlertDialogContent className="bg-card border-border max-w-sm">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-center text-xl">Your free trial has ended</AlertDialogTitle>
        <AlertDialogDescription className="text-center space-y-4 pt-2">
          <p>Subscribe to continue using Vox for your business calls.</p>
          <Button className="w-full font-semibold text-base h-12">Subscribe — ₹999/month</Button>
          <p className="text-xs text-muted-foreground">or ₹599/month billed yearly</p>
          <button className="text-xs text-muted-foreground hover:text-foreground underline">
            Export my call history
          </button>
        </AlertDialogDescription>
      </AlertDialogHeader>
    </AlertDialogContent>
  </AlertDialog>
);

export default TrialExpiredModal;
