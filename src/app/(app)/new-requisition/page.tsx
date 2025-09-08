
'use client';

import { NeedsRecognitionForm } from '@/components/needs-recognition-form';
import { useRouter } from 'next/navigation';

export default function NewRequisitionPage() {
    const router = useRouter();

    const handleSuccess = () => {
        router.push('/requisitions');
    }

    return <NeedsRecognitionForm onSuccess={handleSuccess} />;
}
