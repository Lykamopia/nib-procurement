
'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Vendor, KycStatus } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, FileText, ShieldQuestion } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

export function VendorVerificationPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [action, setAction] = useState<'verify' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vendors');
      const data = await response.json();
      setVendors(data.filter((v: Vendor) => v.kycStatus === 'Pending'));
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch vendors for verification.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleOpenDialog = (vendor: Vendor, type: 'verify' | 'reject') => {
    setSelectedVendor(vendor);
    setAction(type);
  };

  const handleCloseDialog = () => {
    setSelectedVendor(null);
    setAction(null);
    setRejectionReason('');
  };

  const handleSubmit = async () => {
    if (!selectedVendor || !action || !user) return;

    if (action === 'reject' && !rejectionReason) {
      toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide a reason for rejection.' });
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${selectedVendor.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'verify' ? 'Verified' : 'Rejected',
          userId: user.id,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update vendor status.');
      }

      toast({
        title: 'Success',
        description: `Vendor ${selectedVendor.name} has been ${action === 'verify' ? 'verified' : 'rejected'}.`,
      });

      fetchVendors(); // Refresh the list
      handleCloseDialog();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    }
  };

  const getStatusVariant = (status: KycStatus) => {
    switch (status) {
      case 'Verified': return 'default';
      case 'Pending': return 'secondary';
      case 'Rejected': return 'destructive';
    }
  };

  if (loading) {
    return <p>Loading pending verifications...</p>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Vendor KYC Verification</CardTitle>
          <CardDescription>
            Review and verify new vendor applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length > 0 ? (
                  vendors.map(vendor => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>
                        <div>{vendor.contactPerson}</div>
                        <div className="text-sm text-muted-foreground">{vendor.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(vendor.kycStatus)}>{vendor.kycStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => handleOpenDialog(vendor, 'verify')}>Review & Verify</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No vendors are currently pending verification.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!selectedVendor} onOpenChange={open => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify Vendor: {selectedVendor?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><Label>Contact Person</Label><p className="text-sm text-muted-foreground">{selectedVendor?.contactPerson}</p></div>
                <div><Label>Email</Label><p className="text-sm text-muted-foreground">{selectedVendor?.email}</p></div>
                <div><Label>Phone</Label><p className="text-sm text-muted-foreground">{selectedVendor?.phone}</p></div>
                <div className="col-span-2"><Label>Address</Label><p className="text-sm text-muted-foreground">{selectedVendor?.address}</p></div>
            </div>
            <h4 className="font-semibold pt-4">Submitted Documents</h4>
            <div className="flex gap-4">
                <a href="#" target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full"><FileText className="mr-2"/> Business License.pdf</Button>
                </a>
                 <a href="#" target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full"><FileText className="mr-2"/> Tax ID.pdf</Button>
                </a>
            </div>
            {action === 'reject' && (
              <div className="pt-4">
                <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Invalid document, information mismatch..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            {action === 'verify' && (
                 <>
                    <Button variant="destructive" onClick={() => setAction('reject')}>Reject</Button>
                    <Button onClick={handleSubmit}>
                        <CheckCircle className="mr-2" /> Verify Vendor
                    </Button>
                 </>
            )}
            {action === 'reject' && (
                 <>
                    <Button variant="ghost" onClick={() => setAction('verify')}>Back</Button>
                    <Button variant="destructive" onClick={handleSubmit}>
                        <XCircle className="mr-2" /> Confirm Rejection
                    </Button>
                 </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
