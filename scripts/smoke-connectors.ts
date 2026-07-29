import { cloneTemplateConfig } from "@/lib/templates";
import { getByPath } from "@/lib/mapping";
import { executeWorkflow } from "@/lib/workflow";

const cases = [
  ["nowcoder-user", { "user-id": 676891780 }, "requests.nowcoder.nickname"],
  ["zhihu-user", { token: "excited-vczh" }, "requests.zhihu.follower_count"],
  ["leetcode-user", { username: "leetcode" }, "requests.leetcode.accepted.total"],
] as const;

for (const [template, inputs, checkPath] of cases) {
  const result = await executeWorkflow(cloneTemplateConfig(template), inputs);
  const checkValue = getByPath(result.raw, checkPath);
  if (checkValue === undefined || checkValue === null || checkValue === "") {
    throw new Error(`${template} 缺少 ${checkPath}`);
  }
  console.log(`${template}: ${result.data.identity.title} · ${checkPath}=${checkValue}`);
}
