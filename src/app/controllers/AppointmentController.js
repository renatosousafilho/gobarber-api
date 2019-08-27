import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';
import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';

class AppointmentController {
    async index(req, res) {
        const { page = 1 } = req.query;

        const appointments = await Appointment.findAll({
            where: { user_id: req.userId, canceled_at: null },
            order: ['date'],
            attributes: ['id', 'date', 'past', 'cancellable'],
            limit: 20,
            offset: (page-1)*20,
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: File,
                            as: 'avatar',
                            attributes: ['id', 'path', 'url']
                        }
                    ]
                }
            ]
        })
        res.json(appointments);
    }

    async store(req, res) {
        const schema = Yup.object().shape({
            provider_id: Yup.number().required("Provider id is required"),
            date: Yup.date().required("Date is required")
        });

        if (!(await schema.isValid(req.body))) {
            return res.status(401).json({error: 'Validation fails'})
        }

        const { provider_id, date } = req.body;

        // check if provider_id is from valid provider
        const isProvider = await User.findOne({
            where: { id: provider_id, provider: true }
        })

        if (!isProvider) {
            return res.status(400).json({error: 'You can only create appointments with providers'});
        }

        // check if user is different from provider

        // check for past dates
        const hourStart = startOfHour(parseISO(date));

        if (isBefore(hourStart, new Date())) {
            return res.status(400).json({ error: 'Past dates are not permitted!'})
        }

        // check avaliability
        const checkAviability = await Appointment.findOne({
            where: {
                provider_id,
                canceled_at: null,
                date: hourStart
            }
        });

        if (checkAviability) {
            return res.status(400).json({ error: 'Appointment date is not avaliable'})
        }


        const appointment = await Appointment.create({
            user_id: req.userId,
            provider_id,
            date
        });


        // Notify appointment provider
        const user = await User.findByPk(req.userId);
        const formattedDate = format(hourStart, "'dia' dd 'de' MMMM', às' H:mm'h'", {
            locale: pt
        });

        await Notification.create({
            content: `Novo agendamento de ${user.name} para dia ${formattedDate}`,
            user: provider_id,
        })


        

        res.json(appointment);
    }

    async delete(req, res) {
        const appointment = await Appointment.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['name', 'email'],
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['name', 'email'],
                }
            ]
        });

        // check if user signed is owner from appointment
        if (req.userId !== appointment.user_id) {
            return res.status(401).json({error: "You have no permission to cancel this appointment."})
        }

        // check if more than two hours
        const dateWithSub = subHours(appointment.date, 2);
        if (isBefore(dateWithSub, new Date())) {
            return res.status(401).json({error: 'You can only cancel appointments 2 hours in advance.'});
        }

        
        appointment.canceled_at = new Date();

        await appointment.save();

        // Enviar e-mail
        await Queue.add(CancellationMail.key, {
            appointment
        });

        return res.json(appointment);
    }
}

export default new AppointmentController();