
/**
调试方法: 取消文件底部"nodejs调试代码段"的注释, 可以直接用node运行, 不需要用到obsidian;
运行: node src/services/qxxparser.js
 */

const regex_header_card = /^([#]*)((?:[^\n]\n?)+?)(#card(?:[/-]reverse)?)((?: *#.+)*)/iu
const regex_header = /^(#+) /
const regex_id = /^\^(\d{13})/
const regex_code = /^\s*```/

const card_tag = "#card"
let defaultCard = {
	headerHash: "",
	front: "",
	cardTag: "",
	ankiTag: "",
	back: "",
	id: 0,
	startLineIndex: 0,
	endLineIndex: 0,
	source: "", //匹配的完整的卡片
	index: 0, //source的index
}

const parseMd = function (md) {
	md = md.replace(/\r/g, "")
	const lines = md.split("\n")
	lines.push("# 文件结束") //处理结束的边界条件
	let cards = []
	//[header匹配, code匹配]
	//status[0]: 1:表示进入卡片匹配; 
	//status[1]: 1:表示进入代码块匹配; 
	let status = [0, 0]
	let card = null
	for (let index = 0; index < lines.length; index++) {
		let line = lines[index]
		//寻找卡片开头
		if (status[0] == 0) {
			if (line.indexOf(card_tag) <= 0) { continue }
			const match_group = line.match(regex_header_card)
			card = Object.assign({}, defaultCard)
			card.headerHash = match_group[1]
			card.front = match_group[2].trim()
			card.cardTag = match_group[3]
			card.ankiTag = match_group[4]
			card.startLineIndex = index
			status[0] = 1
			continue
		}
		if (line.match(regex_code)) {
			//进入或退出代码段;
			status[1] = status[1] == 0 ? 1 : 0;
			continue;
		}
		//寻找卡片结尾
		if (status[0] == 1 && status[1] == 0) {
			let isEnd = false
			let group = line.match(regex_header)
			if (group) {
				const headerHash = group[1]
				if (headerHash.length <= card.headerHash.length) {
					isEnd = true
				}
			} else {
				group = line.match(regex_id)
				if (group) {
					isEnd = true
					const id = group[1]
					card.id = Number(id)
				}
			}
			if (isEnd) {
				index--; //退回一行, 检查卡片开始;
				status[0] = 0
				card.endLineIndex = index
				card.back = lines.slice(card.startLineIndex + 1, card.endLineIndex+1).join("\n") + "\n"
				card.source = lines.slice(card.startLineIndex, card.endLineIndex+1).join("\n") + "\n" //这里后加的\n不能少, 因为join的最后一行没有添加\n
				card.index = lines.slice(0, card.startLineIndex)
					.map(n => n.length + 1).reduce((a, b) => a + b, 0)
				card.index2 = md.indexOf(card.source)
				cards.push(card)
			}
		}
	}
	return cards;
}
const md2cardMatchs = function (file) {
	const mdcards = parseMd(file)
	const matches = []
	for (let card of mdcards) {
		let match = [
			card.source,//0
			card.headerHash,//1
			card.front,//2
			card.cardTag,//3
			card.ankiTag,//4
			card.back,//5
			card.id,//6
		]
		match.index = card.index;
		matches.push(match)
	}
	return matches;
}

//nodejs调试代码段:
// const fs = require('fs')
// const path = require('path')
// const md = fs.readFileSync(path.resolve('docs/demo2.md'), 'utf8')
// let cards = parseMd(md)
// console.debug('test end', cards)

export { parseMd, md2cardMatchs };
