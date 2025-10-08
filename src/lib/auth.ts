
import type { User, UserRole, Vendor } from './types';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

type VendorDetails = {
    contactPerson: string;
    address: string;
    phone: string;
    licensePath: string;
    taxIdPath: string;
}
    