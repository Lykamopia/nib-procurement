
'use client'
import { Dashboard } from '@/components/dashboard';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();
    const setActiveView = (view: string) => {
        router.push(`/${view}`);
    }
    return <Dashboard setActiveView={setActiveView} />;
}
