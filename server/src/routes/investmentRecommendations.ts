import { Router } from "express";
import { PortfolioRecommendation } from "../models/PortfolioRecommendation";
import { TaxAccount } from "../models/TaxAccount";
import { requireLogin } from "../middleware/requireLogin";
import * as investmentAdvisor from "../utils/investmentAdvisor";

const router = Router();

// Require authentication for all routes
router.use(requireLogin);

/**
 * POST /investment-recommendations/analyze
 * Generate investment recommendation based on goal
 */
router.post("/analyze", async (req, res, next) => {
  try {
    const userId = (req.user as any)._id;
    const {
      currentNetWorth,
      goalAmount,
      goalYear,
      currentAge,
      retirementAge = 65,
      preferLowCost = true,
    } = req.body;

    if (currentNetWorth == null || goalAmount == null || goalYear == null) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Generate recommendation
    const recommendation = investmentAdvisor.generateInvestmentRecommendation(
      currentNetWorth,
      goalAmount,
      goalYear,
      currentAge || 35,
      retirementAge
    );

    // Return recommendation directly without saving to database
    res.json({
      recommendation: {
        riskProfile: recommendation.riskProfile,
        allocation: recommendation.allocation,
        etfs: recommendation.etfs,
        monthlyInvestment: recommendation.monthlyInvestment,
        successProbability: recommendation.successProbability,
        projections: recommendation.projections.slice(0, 10), // First 10 years
        recommendations: recommendation.recommendations,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /investment-recommendations
 * Get all investment recommendations for user
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = (req.user as any)._id;
    const recommendations = await PortfolioRecommendation.find({ userId }).sort({
      createdAt: -1,
    });

    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /investment-recommendations/:id
 * Get specific recommendation
 */
router.get("/:id", async (req, res, next) => {
  try {
    const userId = (req.user as any)._id;
    const { id } = req.params;

    const recommendation = await PortfolioRecommendation.findOne({
      _id: id,
      userId,
    });

    if (!recommendation) {
      return res.status(404).json({ message: "Recommendation not found" });
    }

    res.json({ recommendation });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /investment-recommendations/risk-profile
 * Determine appropriate risk profile
 */
router.post("/risk-profile/analysis", async (req, res, next) => {
  try {
    const { yearsToGoal, currentAge = 35, retirementAge = 65 } = req.body;

    if (!yearsToGoal) {
      return res.status(400).json({ message: "yearsToGoal required" });
    }

    const riskProfile = investmentAdvisor.recommendRiskProfile(
      yearsToGoal,
      currentAge,
      retirementAge
    );

    const allocation = investmentAdvisor.getRiskProfile(riskProfile);
    const etfs = investmentAdvisor.getETFRecommendations(allocation);

    res.json({
      riskProfile,
      allocation,
      etfs,
      explanation: `With a ${yearsToGoal}-year time horizon, a ${riskProfile} portfolio is recommended.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /investment-recommendations/projection
 * Project portfolio growth
 */
router.post("/projection", async (req, res, next) => {
  try {
    const {
      currentAmount,
      monthlyInvestment,
      annualReturnRate = 0.065,
      yearsToProject = 30,
      currentAge = 35,
    } = req.body;

    if (currentAmount == null || monthlyInvestment == null) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const projections = investmentAdvisor.projectPortfolioGrowth(
      currentAmount,
      monthlyInvestment,
      annualReturnRate,
      yearsToProject,
      currentAge
    );

    res.json({
      projections,
      summary: {
        startingBalance: currentAmount,
        monthlyInvestment,
        endingBalance: projections[projections.length - 1].balance,
        totalContributed:
          currentAmount + monthlyInvestment * yearsToProject * 12,
        totalGains:
          projections[projections.length - 1].balance -
          (currentAmount + monthlyInvestment * yearsToProject * 12),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /investment-recommendations/etf-recommendations
 * Get ETF recommendations
 */
router.post("/etf-recommendations", async (req, res, next) => {
  try {
    const { riskProfile = "moderate", preferLowCost = true } = req.body;

    const allocation = investmentAdvisor.getRiskProfile(
      riskProfile as "conservative" | "moderate" | "aggressive"
    );
    const etfs = investmentAdvisor.getETFRecommendations(allocation, preferLowCost);

    // Calculate blended MER
    const averageMER = etfs.reduce((sum, etf) => sum + etf.fee * (etf.allocation / 100), 0);

    res.json({
      riskProfile,
      allocation,
      etfs,
      statistics: {
        averageMER,
        taxEfficiency: "High (Canadian-listed ETFs in TFSA/RRSP)",
        diversification: "Global with Canadian home bias for tax efficiency",
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /investment-recommendations/success-probability
 * Calculate success probability
 */
router.post("/success-probability", async (req, res, next) => {
  try {
    const {
      currentAmount,
      monthlyInvestment,
      goalAmount,
      yearsToGoal,
      riskProfile = "moderate",
    } = req.body;

    if (currentAmount == null || monthlyInvestment == null || goalAmount == null || yearsToGoal == null) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const probability = investmentAdvisor.calculateSuccessProbability(
      currentAmount,
      monthlyInvestment,
      goalAmount,
      yearsToGoal,
      riskProfile
    );

    res.json({
      goalAmount,
      yearsToGoal,
      monthlyInvestment,
      riskProfile,
      successProbability: probability,
      interpretation:
        probability >= 75
          ? "Excellent - Very likely to achieve goal"
          : probability >= 60
          ? "Good - Likely to achieve goal"
          : probability >= 50
          ? "Fair - May achieve goal; consider increasing contributions"
          : "At Risk - Not enough to achieve goal; reconsider plan",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
