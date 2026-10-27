import './env.js';
import { Injectable, Logger, ServiceUnavailableException, BadGatewayException } from '@nestjs/common';
import { DbService, GB, OD } from './db.service.js';

/**
 * AI 기능: 관리자가 누르면 GPT가 "지금 신청 현황"을 쉬운 말로 요약하고, 운영자가 할 일을 제안한다.
 * - GPT에는 숫자와 상품명만 보낸다. 신청자 이름·연락처는 보내지 않는다.
 * - GPT_API_KEY는 이 서버의 설정값에만 있다. 프론트엔드나 GitHub에는 없다.
 */
@Injectable()
export class AiService {
  private readonly log = new Logger('AI');
  constructor(private readonly db: DbService) {}

  async summarize() {
    const key = process.env.GPT_API_KEY;
    if (!key) throw new ServiceUnavailableException({ message: 'AI 기능이 아직 설정되지 않았어요. (GPT_API_KEY)' });

    const { rows } = await this.db.pool.query(`
      SELECT g.title, g.category, g.origin, g.total_boxes AS "total", g.max_per_person AS "maxPerPerson",
             g.deadline, (g.deadline > now()) AS "isOpen",
             COALESCE(SUM(o.boxes) FILTER (WHERE o.status = '신청'), 0)::int AS "ordered",
             COUNT(DISTINCT o.user_id) FILTER (WHERE o.status = '신청')::int AS "applicants",
             COUNT(o.id) FILTER (WHERE o.status = '취소')::int AS "cancelledOrders"
      FROM ${GB} g LEFT JOIN ${OD} o ON o.group_buy_id = g.id
      GROUP BY g.id ORDER BY g.deadline`);

    const now = Date.now();
    const lines = rows.map((r) => {
      const hours = Math.round((new Date(r.deadline).getTime() - now) / 3600_000);
      const remaining = r.total - r.ordered;
      const state = r.isOpen ? `진행중, 마감까지 약 ${hours}시간` : '마감';
      return `- ${r.title} (${r.category}/${r.origin}): ${state}, 신청 ${r.ordered}/${r.total}박스(남은 ${remaining}박스), 신청자 ${r.applicants}명, 취소 ${r.cancelledOrders}건, 1인 최대 ${r.maxPerPerson}박스`;
    });
    const data = lines.join('\n');

    const system =
      '너는 동네 로컬푸드 마켓의 운영 도우미야. 개발이나 통계를 모르는 운영자가 읽는다. ' +
      '한국어로, 쉬운 말로, 짧게 답해. 주어진 숫자만 근거로 쓰고 없는 내용은 지어내지 마.';
    const user =
      `아래는 지금 공동구매 신청 현황이야.\n${data}\n\n` +
      '다음 형식으로 답해 줘.\n' +
      '[한눈에 보기] 2문장 이내\n' +
      '[주목할 공동구매] 진행 중인 것 중 마감이 임박했거나, 거의 다 찼거나, 신청이 적은 것 2~3개를 이유와 함께 한 줄씩\n' +
      '(거의 다 찼으면 "곧 품절"이라고 알리고, 신청이 적으면 "홍보가 필요"라고 구분해서 써. 이미 마감된 것은 언급만 하고 권하지 마.)\n' +
      '[운영자가 할 일] 오늘 할 만한 일 2가지';

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.GPT_MODEL ?? 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 500,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (e) {
      this.log.error(`GPT 호출 실패: ${(e as Error).message}`);
      throw new BadGatewayException({ message: 'AI가 지금 답하지 못해요. 잠시 뒤에 다시 시도해 주세요.' });
    }
    if (!res.ok) {
      // 키가 노출되지 않도록 상태 코드만 기록한다
      this.log.error(`GPT 응답 오류: ${res.status}`);
      throw new BadGatewayException({ message: 'AI가 지금 답하지 못해요. 잠시 뒤에 다시 시도해 주세요.' });
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const summary = json.choices?.[0]?.message?.content?.trim();
    if (!summary) throw new BadGatewayException({ message: 'AI가 빈 답을 보냈어요. 다시 시도해 주세요.' });
    return { summary, groupBuys: rows.length, createdAt: new Date().toISOString() };
  }
}
