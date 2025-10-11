
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function ComingSoonPage() {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full">
                        <Clock className="h-10 w-10" />
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    <CardTitle className="text-3xl font-bold">Coming Soon!</CardTitle>
                    <CardDescription className="mt-2 text-lg text-muted-foreground">
                        The dashboard for your role is currently under construction.
                    </CardDescription>
                    <p className="mt-4 text-sm text-muted-foreground">
                        We are working hard to bring you a new set of features. Please check back later.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
