function resetModal(connection) {
    connection = connection.charAt(0).toUpperCase() + connection.slice(1);
    $('#resetTitle').html('Reset ' + connection + ' Connection?');
    $('#resetDescription').html('Resetting will clear all existing ' + connection + ' posts. It will also set the last updated time for ' + connection + ' to yesterday.');
    $('#resetConfirm').html('Reset ' + connection);
    $('#resetModal').openModal();
}

function reset(connection) {
    $.post('/reset/' + connection, function(data) {
        Materialize.toast(data.message, 4000, '', function() {
            if (data.refresh)
            {
                window.location.reload();
            }
        });
    }).fail(function(data) {
        Materialize.toast(data.responseJSON.message, 4000);
    });
}