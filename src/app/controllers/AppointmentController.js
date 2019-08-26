import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';

class AppointmentController {
    async index(req, res) {
        const { page = 1 } = req.query;

        const appointments = await Appointment.findAll({
            where: { user_id: req.userId, canceled_at: null },
            order: ['date'],
            attributes: ['id', 'date'],
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
        })

        await Notification.create({
            content: `Novo agendamento de ${user.name} para dia ${formattedDate}`,
            user: provider_id,
        })


        

        res.json(appointment);
    }
}

export default new AppointmentController();