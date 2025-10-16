import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import './Historial.css';
import SeleccionHistorial from './SeleccionHistorial';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const USERNAME = 'alberto';

// Usamos forwardRef para exponer funciones al padre
const Historial = forwardRef((props, ref) => {
  const [transcripciones, setTranscripciones] = useState([]);
  const [selectedTranscripcion, setSelectedTranscripcion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [filterError, setFilterError] = useState('');

  const fetchHistorial = async (filters = {}) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ username: USERNAME, ...filters });
      const response = await axios.get(`${BASE_URL}/api/audios/filter?${params}`);
      if (response.status === 304) {
        return;
      }
      if (Array.isArray(response.data.data)) {
        setTranscripciones(response.data.data);
      } else if (response.data.error) {
        setError(`Error del servidor: ${response.data.error}`);
      }
    } catch {
      setError('Error al obtener el historial');
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: () => fetchHistorial()
  }));

  useEffect(() => {
    fetchHistorial();
  }, []);

  const handleFilter = () => {
    setFilterError('');
    if (dateFromFilter && dateToFilter && dateFromFilter > dateToFilter) {
      setFilterError('La fecha desde no puede ser posterior a la fecha hasta');
      return;
    }
    const filters = {};
    if (nameFilter) filters.name = nameFilter;
    if (descriptionFilter) filters.description = descriptionFilter;
    if (dateFromFilter) filters.dateFrom = dateFromFilter;
    if (dateToFilter) filters.dateTo = dateToFilter;
    fetchHistorial(filters);
  };

  const handleDateFromChange = (value) => {
    setDateFromFilter(value);
    if (value && dateToFilter && value > dateToFilter) {
      setFilterError('La fecha desde no puede ser posterior a la fecha hasta');
    } else {
      setFilterError('');
    }
  };

  const handleDateToChange = (value) => {
    setDateToFilter(value);
    if (dateFromFilter && value && dateFromFilter > value) {
      setFilterError('La fecha hasta no puede ser anterior a la fecha desde');
    } else {
      setFilterError('');
    }
  };

  const handleClearFilters = () => {
    setNameFilter('');
    setDescriptionFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setFilterError('');
    fetchHistorial();
  };

  return (
    <div className='historial-page'>
      <aside className='sidebar'>
        <h2 style={{textAlign:'center'}}>Historial</h2>
        <div className='filters'>
          <input
            type='text'
            placeholder='Filtrar por nombre'
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
          <input
            type='text'
            placeholder='Filtrar por descripción'
            value={descriptionFilter}
            onChange={(e) => setDescriptionFilter(e.target.value)}
          />
          <label>Fecha desde:</label>
          <input
            type='date'
            value={dateFromFilter}
            onChange={(e) => handleDateFromChange(e.target.value)}
          />
          <label>Fecha hasta:</label>
          <input
            type='date'
            value={dateToFilter}
            onChange={(e) => handleDateToChange(e.target.value)}
          />
          {filterError && <p style={{color: 'red'}}>{filterError}</p>}
          <button onClick={handleFilter}>Filtrar</button>
          <button onClick={handleClearFilters}>Limpiar</button>
        </div>
        {loading ? (
          <p>Cargando...</p>
        ) : error ? (
          <p>{error}</p>
        ) : transcripciones.length === 0 ? (
          <p>No hay transcripciones</p>
        ) : (
          <ul className='sidebar-list'>
            {transcripciones.map((t, index) => (
              <li
                key={index}
                className='sidebar-item'
                onClick={() => setSelectedTranscripcion(t)}
              >
                {t.name}
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className='main-content'>
        <SeleccionHistorial
          show={selectedTranscripcion !== null}
          onClose={() => setSelectedTranscripcion(null)}
          transcripcion={selectedTranscripcion || {}}
          onDelete={() => fetchHistorial()}
        />
      </main>
    </div>
  );
});

export default Historial;
