
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ArrowRight,
  User,
  Users,
  Building,
  Briefcase,
  Shield,
  Gavel,
  Crown,
} from 'lucide-react';
import React from 'react';

const workflowSteps = [
  { role: 'Requester', icon: User, description: 'Initiates a purchase requisition.' },
  { role: 'Division Manager', icon: Users, description: 'First-level approval within the department.' },
  { role: 'Department Head', icon: Building, description: 'Second-level approval by the head of the department.' },
  { role: 'Procurement Director', icon: Briefcase, description: 'Final approval before procurement process begins.' },
  { role: 'Procurement Officer', icon: Shield, description: 'Manages RFQ process and vendor communication.' },
  { role: 'Evaluation Committee', icon: Gavel, description: 'Scores and evaluates vendor submissions.' },
  { role: 'Procurement Director (Award)', icon: Crown, description: 'Makes the final award decision based on evaluation.' },
];

export function WorkflowEditor() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Procurement Approval Workflow</CardTitle>
        <CardDescription>
          This is the standard approval flow for purchase requisitions. This view is currently read-only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          {workflowSteps.map((step, index) => (
            <React.Fragment key={step.role}>
              <Card className="p-4 flex items-center gap-4 bg-muted/30">
                <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-full">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold">{step.role}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </Card>
              {index < workflowSteps.length - 1 && (
                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90 md:rotate-0" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
