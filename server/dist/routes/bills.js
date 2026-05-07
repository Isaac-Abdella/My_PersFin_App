"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Bill_1 = require("../models/Bill");
const requireLogin_1 = require("../middleware/requireLogin");
const router = (0, express_1.Router)();
router.use(requireLogin_1.requireLogin);
/**
 * GET /bills
 * Get all bills for the user
 */
router.get('/', async (req, res, next) => {
    try {
        const userId = req.user._id;
        const status = req.query.status;
        const query = { userId };
        if (status) {
            query.status = status;
        }
        const bills = await Bill_1.Bill.find(query).sort({ dueDate: 1 });
        const billsWithUpcoming = bills.map(bill => ({
            ...bill.toObject(),
            nextPaymentDate: getNextPaymentDate(bill),
            isOverdue: isPaymentOverdue(bill),
            monthlyEquivalent: getMonthlyEquivalent(bill),
        }));
        res.json({ bills: billsWithUpcoming });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /bills
 * Create a new bill
 */
router.post('/', async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { name, description, category, amount, frequency = 'monthly', dueDate, paymentMethod, accountId, reminderDaysBefore = 3, isAutoPay = false, notes, } = req.body;
        if (!name || !category || !amount || !dueDate) {
            return res.status(400).json({ message: 'Name, category, amount, and dueDate are required' });
        }
        const bill = await Bill_1.Bill.create({
            userId,
            name,
            description,
            category,
            amount,
            frequency,
            dueDate,
            paymentMethod,
            accountId,
            reminderDaysBefore,
            isAutoPay,
            notes,
        });
        res.json({ bill });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /bills/summary
 * Get bills summary (total monthly, upcoming, etc.)
 * MUST be before /:id so Express doesn't treat "summary" as an id.
 */
router.get('/summary', async (req, res, next) => {
    try {
        const userId = req.user._id;
        const activeBills = await Bill_1.Bill.find({ userId, status: 'active' });
        const monthlyTotal = activeBills.reduce((sum, bill) => {
            return sum + getMonthlyEquivalent(bill);
        }, 0);
        const nextPaymentBills = activeBills
            .map(bill => ({
            ...bill.toObject(),
            nextPaymentDate: getNextPaymentDate(bill),
            monthlyEquivalent: getMonthlyEquivalent(bill),
        }))
            .sort((a, b) => a.nextPaymentDate.getTime() - b.nextPaymentDate.getTime())
            .slice(0, 5);
        const byCategory = {};
        activeBills.forEach(bill => {
            if (!byCategory[bill.category]) {
                byCategory[bill.category] = 0;
            }
            byCategory[bill.category] += getMonthlyEquivalent(bill);
        });
        res.json({
            summary: {
                totalMonthly: monthlyTotal,
                byCategory,
                upcomingBills: nextPaymentBills,
                totalBills: activeBills.length,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /bills/:id
 * Get a specific bill
 */
router.get('/:id', async (req, res, next) => {
    try {
        const userId = req.user._id;
        const bill = await Bill_1.Bill.findOne({ _id: req.params.id, userId });
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.json({
            bill: {
                ...bill.toObject(),
                nextPaymentDate: getNextPaymentDate(bill),
                isOverdue: isPaymentOverdue(bill),
                monthlyEquivalent: getMonthlyEquivalent(bill),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * PUT /bills/:id
 * Update a bill
 */
router.put('/:id', async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { name, description, category, amount, frequency, dueDate, paymentMethod, accountId, reminderDaysBefore, isAutoPay, status, notes } = req.body;
        const bill = await Bill_1.Bill.findOneAndUpdate({ _id: req.params.id, userId }, {
            name,
            description,
            category,
            amount,
            frequency,
            dueDate,
            paymentMethod,
            accountId,
            reminderDaysBefore,
            isAutoPay,
            status,
            notes,
        }, { new: true });
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.json({ bill });
    }
    catch (err) {
        next(err);
    }
});
/**
 * DELETE /bills/:id
 * Delete a bill
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const userId = req.user._id;
        const bill = await Bill_1.Bill.findOneAndDelete({ _id: req.params.id, userId });
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.json({ message: 'Bill deleted' });
    }
    catch (err) {
        next(err);
    }
});
/**
 * PATCH /bills/:id/status
 * Update bill status
 */
router.patch('/:id/status', async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { status } = req.body;
        if (!['active', 'paused', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const bill = await Bill_1.Bill.findOneAndUpdate({ _id: req.params.id, userId }, { status }, { new: true });
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.json({ bill });
    }
    catch (err) {
        next(err);
    }
});
function getNextPaymentDate(bill) {
    const today = new Date();
    const dayOfMonth = bill.dueDate;
    let nextDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
    if (nextDate < today) {
        nextDate = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
    }
    return nextDate;
}
function isPaymentOverdue(bill) {
    const today = new Date();
    const lastDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dueDay = Math.min(bill.dueDate, lastDayOfCurrentMonth);
    const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    return dueDate < today;
}
function getMonthlyEquivalent(bill) {
    const frequencyMap = {
        weekly: 4.33,
        biweekly: 2.17,
        monthly: 1,
        quarterly: 0.33,
        annual: 0.083,
    };
    return bill.amount * (frequencyMap[bill.frequency] || 1);
}
exports.default = router;
