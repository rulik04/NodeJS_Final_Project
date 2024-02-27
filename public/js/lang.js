function changeLanguage(lang) {
    fetch(`/change-language?lang=${lang}`, { method: 'POST' })
        .then(() => location.reload())
        .catch(error => console.error('Error changing language:', error));
}