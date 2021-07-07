const j = require('jscodeshift')
const csstree = require('css-tree')
const fs = require('fs')

const addClassNamePrefixHelper = (name, prefixName) => {
  const classList = name.split(' ')
  const newClassName =
  classList
  .map(i => {
    if (!(/^(\w|-)+$/.test(i))) {
      return i
    }

    return `${prefixName}_${i}`
  })
  .join(' ')

  return newClassName
}

const modifyJsFile = (prefixName, source) => {
  // source为源代码，通过node fs.readFile获取的string
  const ast = j(source)

  /**
   * 匹配 className: "xxx xxx"
   */
  ast
  .find(j.Property, {
    key: {
      name: 'className'
    }
  })
  .find(j.Literal)
  .forEach(item => {
    if (item?.value?.value && typeof item?.value?.value === 'string') {
      const newClassName = addClassNamePrefixHelper(item.value.value, prefixName)

      j(item).replaceWith(j.literal(newClassName))
    }
  })

  /**
   * 匹配 _emotion_react__WEBPACK_IMPORTED_MODULE_0__["css"]`
     .xxx {
      ...
    }
   */
  ast
  .find(j.TaggedTemplateExpression)
  .filter(item => item.value.tag.object.name.includes('_emotion_react__WEBPACK_IMPORTED_MODULE_'))
  .find(j.TemplateLiteral)
  .find(j.TemplateElement)
  .forEach(item => {
    const newStr = item?.value?.value?.raw?.replace(/\.{1}(\w|-)+/g, `.${prefixName}_$1`)

    j(item).replaceWith(j.templateElement({ cooked: newStr, raw: newStr }, false))
  })

  /**
   * 匹配  Object(_emotion_css__WEBPACK_IMPORTED_MODULE_1__["cx"])('xxx', aaa);
   */
  ast
  .find(j.CallExpression, {
    callee: {
      arguments: [{
        object: {
          name: '_emotion_css__WEBPACK_IMPORTED_MODULE_1__'
        },
        property: {
          value: 'cx'
        }
      }]
    }
  })
  .find(j.Literal)
  .filter(item => (item.parentPath.name === 'arguments' || item.name === 'key')&& typeof item.value.value === 'string')
  .forEach(item => {
    const newClassName = addClassNamePrefixHelper(item.value.value, prefixName)

    j(item).replaceWith(j.literal(newClassName))
  })

  /**
   * 匹配 xxx: () => '.xxx',
   */
  ast
  .find(j.Property)
  .find(j.ArrowFunctionExpression)
  .find(j.Literal)
  .filter(item => item.name === 'body')
  .forEach(item => {
    if (item?.value?.value && typeof item?.value?.value === 'string')
    j(item).replaceWith(j.literal(`.${prefixName}_${item.value.value.substr(1)}`))
  })

  /**
   * 匹配 内嵌模板 '<a class="xxx" .../>'
   */
  ast
  .find(j.Literal)
  .filter(item => typeof item?.value?.value === 'string' && RegExp(/class=/).test(item.value.value))
  .forEach(item => {
    const reg = /class=(\"|\')([^\"\']*)(\"|\')/g;

    reg.exec(item.value.value)
    const str = RegExp.$2;

    newStr = addClassNamePrefixHelper(str, prefixName)

    j(item).replaceWith(j.literal(item.value.value.replace(str, newStr)))
  })

  return ast.toSource()
}

const modifyCssFile = (prefixName, source) => {
  const ast = csstree.parse(source)

  csstree.walk(ast, node => {
    if (node.type === 'ClassSelector') {
      node.name = `${prefixName}_${node.name}`
    }
  })

  return csstree.generate(ast)
}

const addPrefix = (prefixName, filePath, extname) => {
  const originData = fs.readFileSync(filePath, 'utf8')
  const newData = extname === '.js' ? modifyJsFile(prefixName, originData) : modifyCssFile(prefixName, originData)

  fs.writeFileSync(filePath, newData)
}

module.exports = addPrefix
