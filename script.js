let ninjas =
    JSON.parse(localStorage.getItem("ninjas")) || [];


const form =
    document.getElementById("formNinja");


const lista =
    document.getElementById("listaNinjas");


// ============================
// READ
// ============================

function mostrarNinjas() {

    lista.innerHTML = "";


    ninjas.forEach(function(ninja) {

        const linha =
            document.createElement("tr");


        linha.innerHTML = `

            <td>${ninja.id}</td>

            <td>${ninja.nome}</td>

            <td>${ninja.elemento}</td>

            <td>${ninja.arma}</td>

            <td>${ninja.nivel}</td>

            <td>${ninja.status}</td>

            <td>

                <button
                    class="editar"
                    onclick="editarNinja(${ninja.id})">

                    Editar

                </button>


                <button
                    class="excluir"
                    onclick="excluirNinja(${ninja.id})">

                    Excluir

                </button>

            </td>
        `;


        lista.appendChild(linha);

    });

}


// ============================
// CREATE / UPDATE
// ============================

form.addEventListener(
    "submit",
    function(event) {

        event.preventDefault();


        const id =
            document.getElementById("id").value;


        const nome =
            document.getElementById("nome").value;


        const elemento =
            document.getElementById("elemento").value;


        const arma =
            document.getElementById("arma").value;


        const nivel =
            document.getElementById("nivel").value;


        const status =
            document.getElementById("status").value;


        // UPDATE

        if (id !== "") {

            const ninja =
                ninjas.find(function(ninja) {

                    return ninja.id == id;

                });


            ninja.nome = nome;

            ninja.elemento = elemento;

            ninja.arma = arma;

            ninja.nivel = nivel;

            ninja.status = status;


            alert(
                "Ninja atualizado com sucesso!"
            );

        }


        // CREATE

        else {

            const novoNinja = {

                id: Date.now(),

                nome: nome,

                elemento: elemento,

                arma: arma,

                nivel: nivel,

                status: status

            };


            ninjas.push(novoNinja);


            alert(
                "Ninja cadastrado com sucesso!"
            );

        }


        salvarDados();

        mostrarNinjas();

        limparFormulario();

    }
);


// ============================
// UPDATE
// ============================

function editarNinja(id) {

    const ninja =
        ninjas.find(function(ninja) {

            return ninja.id == id;

        });


    document.getElementById("id").value =
        ninja.id;


    document.getElementById("nome").value =
        ninja.nome;


    document.getElementById("elemento").value =
        ninja.elemento;


    document.getElementById("arma").value =
        ninja.arma;


    document.getElementById("nivel").value =
        ninja.nivel;


    document.getElementById("status").value =
        ninja.status;


    document.getElementById(
        "btnSalvar"
    ).textContent =
        "Salvar alteração";


    document.getElementById(
        "btnCancelar"
    ).style.display =
        "block";

}


// ============================
// DELETE
// ============================

function excluirNinja(id) {

    const confirmar =
        confirm(
            "Deseja excluir este ninja?"
        );


    if (confirmar) {

        ninjas =
            ninjas.filter(function(ninja) {

                return ninja.id != id;

            });


        salvarDados();

        mostrarNinjas();

    }

}


// ============================
// CANCELAR
// ============================

function cancelarEdicao() {

    limparFormulario();

}


// ============================
// LIMPAR FORMULÁRIO
// ============================

function limparFormulario() {

    form.reset();


    document.getElementById("id").value =
        "";


    document.getElementById(
        "btnSalvar"
    ).textContent =
        "Cadastrar Ninja";


    document.getElementById(
        "btnCancelar"
    ).style.display =
        "none";

}


// ============================
// LOCAL STORAGE
// ============================

function salvarDados() {

    localStorage.setItem(
        "ninjas",
        JSON.stringify(ninjas)
    );

}


// ============================
// INICIAR
// ============================

mostrarNinjas();