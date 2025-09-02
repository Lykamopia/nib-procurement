
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { register } from '@/lib/auth';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Requester');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const vendorDetails = role === 'Vendor' ? { contactPerson, address, phone } : undefined;

    const result = await register(name, email, password, role, vendorDetails);
    if (result) {
      authLogin(result.token, result.user, result.role);
      toast({
        title: 'Registration Successful',
        description: `Welcome, ${result.user.name}!`,
      });
      router.push('/');
    } else {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: 'A user with this email already exists.',
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Sign Up</CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Role</Label>
              <RadioGroup
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Requester" id="r1" />
                  <Label htmlFor="r1">Requester</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Approver" id="r2" />
                  <Label htmlFor="r2">Approver</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Procurement Officer" id="r3" />
                  <Label htmlFor="r3">Procurement</Label>
                </div>
                 <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Vendor" id="r4" />
                  <Label htmlFor="r4">Vendor</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="name">{role === 'Vendor' ? 'Company Name' : 'Full Name'}</Label>
              <Input 
                id="name" 
                placeholder={role === 'Vendor' ? 'Your Company LLC' : 'Jane Doe'}
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {role === 'Vendor' && (
                <>
                    <Separator />
                     <p className="text-sm text-muted-foreground">Please provide your business details for verification.</p>
                    <div className="grid gap-2">
                        <Label htmlFor="contactPerson">Contact Person</Label>
                        <Input 
                            id="contactPerson" 
                            placeholder="Jane Doe" 
                            required 
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.target.value)}
                        />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input 
                            id="phone" 
                            placeholder="(555) 123-4567" 
                            required 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="address">Business Address</Label>
                        <Input 
                            id="address" 
                            placeholder="123 Main St, Anytown, USA" 
                            required 
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="license">Business License</Label>
                        <Input id="license" type="file" required />
                         <p className="text-xs text-muted-foreground">Upload a PDF of your business license.</p>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="tax-id">Tax ID Document</Label>
                        <Input id="tax-id" type="file" required />
                         <p className="text-xs text-muted-foreground">Upload a PDF of your tax registration.</p>
                    </div>
                </>
            )}

          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create an account
            </Button>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
