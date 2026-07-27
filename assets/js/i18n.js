// Мини-помощник для JS-стороны интернационализации (см. includes/i18n.php).
// window.MW_I18N уже содержит смёрженный словарь (ru + текущий язык),
// эта функция — просто удобный доступ с подстановкой {var} и фолбэком
// на сам ключ, если перевод почему-то не нашёлся.
function t(key, vars) {
    var dict = window.MW_I18N || {};
    var value = dict[key] !== undefined ? dict[key] : key;
    if (vars) {
        for (var k in vars) {
            if (Object.prototype.hasOwnProperty.call(vars, k)) {
                value = value.split(k).join(vars[k]);
            }
        }
    }
    return value;
}
