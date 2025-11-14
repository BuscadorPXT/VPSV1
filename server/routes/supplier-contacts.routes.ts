
import { Router } from 'express';
import { auth } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get supplier contacts
router.get('/contacts', auth, async (req, res) => {
  try {
    console.log('📞 Fetching supplier contacts for user:', req.user?.email);

    // For now, return mock data since we don't have a suppliers table with contacts
    // In a real implementation, this would query the database
    const mockContacts = {
      "TechWorld": {
        telefone: "5511999887766",
        endereco: "São Paulo, SP"
      },
      "MobileStore": {
        telefone: "5521987654321", 
        endereco: "Rio de Janeiro, RJ"
      },
      "GadgetHub": {
        telefone: "5511876543210",
        endereco: "São Paulo, SP"  
      },
      "SmartPhone Express": {
        telefone: "5511765432109",
        endereco: "São Paulo, SP"
      },
      "Digital Palace": {
        telefone: "5521654321098", 
        endereco: "Rio de Janeiro, RJ"
      }
    };

    // TODO: Replace with actual database query
    // const suppliers = await prisma.supplier.findMany({
    //   select: {
    //     name: true,
    //     phone: true,
    //     address: true
    //   }
    // });

    res.json({
      success: true,
      contacts: mockContacts
    });

  } catch (error) {
    console.error('Error fetching supplier contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar contatos dos fornecedores'
    });
  }
});

export default router;
