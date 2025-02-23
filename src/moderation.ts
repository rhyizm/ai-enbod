import OpenAI from "openai";

interface ModerationCheckResponse {
  flagged: boolean;
  categories: {
    name: string;
    score: number;
  }[];
}

class Moderation {
  private openai: OpenAI | undefined;
  private sexualScoreThreshold = 0.15;

  constructor() {
    this.openai = new OpenAI();
  }

  async check(content: string, thresholdScore: number | null = null): Promise<ModerationCheckResponse> {
    if (!this.openai) {
      this.openai = new OpenAI();
    }
    const moderationCreateResponse = await this.openai.moderations.create({
      input: content,
      model: "text-moderation-stable",
    });
    
    const results = moderationCreateResponse.results[0];

    // 閾値が設定されていない場合は元のフラグを使用
    let flagged = thresholdScore === null ? results.flagged : false;

    const flaggedCategories = Object.keys(results.category_scores)
      .map(key => ({
        name: key,
        score: results.category_scores[key as keyof typeof results.category_scores]
      }))
      .filter(category => {
        // 特定カテゴリのスコア閾値の適用
        if (category.name === "sexual" || category.name === "sexual/minors") {
          return category.score > this.sexualScoreThreshold;
        } else {
          return thresholdScore !== null && category.score > thresholdScore;
        }
      })
      .sort((a, b) => b.score - a.score);

    // 閾値が設定されている場合は、結果のカテゴリに基づいてフラグを再評価
    if (thresholdScore !== null) {
      flagged = flaggedCategories.length > 0;
    }

    return {
      flagged,
      categories: flaggedCategories
    };
  }
}

if (require.main === module) {
  (async () => {
    const moderation = new Moderation();
    const content = "People who live in glass houses should shut the hell up.";
    const thresholdScore = 0.1;  // 一般のカテゴリに適用する閾値
    const moderationResponse = await moderation.check(content, thresholdScore);
    console.log("Moderation Response:", moderationResponse);
  })();
}

export default Moderation;