import * as Lint from 'tslint';
import * as ts from 'typescript';
import * as tsutils from 'tsutils';

interface TodoCommentRange {
  comment: string;
  start: number;
  end: number;
}

interface RuleOption {
  assignableList: string[]
}

export class Rule extends Lint.Rules.AbstractRule {

  apply(sourceFile: ts.SourceFile):  Lint.RuleFailure[] {
    // 获取参数
    const { ruleArguments } = this.getOptions();
    const assignableList = Array.isArray(ruleArguments[0]) ? ruleArguments[0] : [];
    return this.applyWithFunction(sourceFile, walk, { assignableList });
  }

}

function walk(ctx: Lint.WalkContext<RuleOption>) {
  const unassignedList: TodoCommentRange[] = [];
  const assignableList = ctx.options.assignableList;
  for (const node of ctx.sourceFile.statements) {

    // 遍历每个 node 中的注释
    tsutils.forEachComment(node, (fullText: string, range: ts.CommentRange) => {

      // 提取注释文本
      const comment = fullText.slice(range.pos, range.end);
      const regexp = /\b(?:TODO)(?:\((.+)\))?.+\b.*/gi;

      let match;
      // 匹配所有 to-do 并且未分配受让人的注释，并添加到 `unassignedList` 数组中
      while ((match = regexp.exec(comment)) !== null) {
        const assignedID = match[1];
        const nonassignable = assignableList.length && assignableList.indexOf(assignedID) === -1;

        // 如果没有指定 ID，或者不在可分配列表中
        if (!assignedID || nonassignable) {
          unassignedList.push({
            comment,
            start: range.pos + match.index,
            end: range.pos + regexp.lastIndex
          });
        }
      }
    })
  }

  unassignedList.forEach(item => {
    // 删除对应注释
    const fix = Lint.Replacement.deleteFromTo(item.start, item.end);
    // 添加到 Failure 列表
    ctx.addFailure(item.start, item.end, 'This To-Do assignee incorrect', fix)
  })
}
