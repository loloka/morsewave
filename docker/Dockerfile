FROM php:8.4-apache

# pdo_mysql — для работы с MySQL через PDO (как в config/database.php)
RUN docker-php-ext-install pdo pdo_mysql

# mod_rewrite не обязателен для роутинга (тут обычные .php-страницы),
# но включаем на будущее + mod_headers для полноты.
RUN a2enmod rewrite headers

# По умолчанию Apache в этом образе игнорирует .htaccess (AllowOverride None).
# Без этого не сработают config/.htaccess и database/.htaccess.
COPY docker/apache-allowoverride.conf /etc/apache2/conf-available/allowoverride.conf
RUN a2enconf allowoverride

WORKDIR /var/www/html
